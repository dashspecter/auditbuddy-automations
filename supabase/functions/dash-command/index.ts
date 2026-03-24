import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Shared Capability Layer Imports ───
import { AUDIT_FINISHED_STATUSES, DEFAULT_TIMEZONE, MAX_TOOL_ROWS, MODULE_CODES } from "./shared/constants.ts";
import { resultToToolResponse } from "./shared/contracts.ts";
import { type PermissionContext } from "./shared/permissions.ts";
import {
  getTimeOffBalance,
  listTimeOffRequests,
  listPendingApprovals,
  checkTimeOffConflicts,
  getTeamTimeOffCalendar,
  createTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  cancelTimeOffRequest,
} from "./capabilities/time-off.ts";

// ─── Module Gating Map (canonical module codes matching company_modules.module_name) ───
const TOOL_MODULE_MAP: Record<string, string> = {
  get_audit_results: "location_audits",
  compare_location_performance: "location_audits",
  get_open_corrective_actions: "corrective_actions",
  get_attendance_exceptions: "workforce",
  get_work_order_status: "cmms",
  get_document_expiries: "documents",
  get_training_gaps: "workforce",
  search_employees: "workforce",
  execute_employee_creation: "workforce",
  execute_audit_template_creation: "location_audits",
  reassign_corrective_action: "corrective_actions",
  execute_ca_reassignment: "corrective_actions",
  create_shift_draft: "workforce",
  execute_shift_creation: "workforce",
  transform_spreadsheet_to_schedule: "workforce",
  transform_sop_to_training: "workforce",
  // Time-Off capability tools
  get_time_off_balance: "workforce",
  list_time_off_requests: "workforce",
  list_pending_time_off_approvals: "workforce",
  check_time_off_conflicts: "workforce",
  get_team_time_off_calendar: "workforce",
  create_time_off_request_draft: "workforce",
  execute_time_off_request: "workforce",
  approve_time_off_request_draft: "workforce",
  execute_time_off_approval: "workforce",
  reject_time_off_request_dash: "workforce",
  cancel_time_off_request_dash: "workforce",
};

// ─── Action-name to execute-tool resolver (server-authoritative) ───
const ACTION_EXECUTE_MAP: Record<string, string> = {
  create_shift: "execute_shift_creation",
  create_employee: "execute_employee_creation",
  create_audit_template: "execute_audit_template_creation",
  reassign_corrective_action: "execute_ca_reassignment",
  reassign_ca: "execute_ca_reassignment",
  create_time_off_request: "execute_time_off_request",
  approve_time_off_request: "execute_time_off_approval",
};

/** Hydrate execution args from pending action's preview_json based on action_name */
function hydrateArgsFromDraft(actionName: string, previewJson: any): Record<string, any> {
  if (!previewJson) return {};
  switch (actionName) {
    case "create_audit_template":
      return {
        template_name: previewJson.name || previewJson.template_name,
        description: previewJson.description || null,
        sections: previewJson.sections || [],
      };
    case "create_employee":
      return {
        full_name: previewJson.full_name,
        email: previewJson.email || null,
        phone: previewJson.phone || null,
        role: previewJson.role || "staff",
        department_id: previewJson.department_id || null,
        location_id: previewJson.location_id,
        cnp: previewJson.cnp || null,
        date_of_birth: previewJson.date_of_birth || null,
        id_series: previewJson.id_series || null,
        id_number: previewJson.id_number || null,
        address: previewJson.address || null,
        start_date: previewJson.start_date || null,
      };
    case "create_shift":
      return {
        location_id: previewJson.location_id,
        role: previewJson.role,
        shift_date: previewJson.shift_date,
        start_time: previewJson.start_time,
        end_time: previewJson.end_time,
        min_staff: previewJson.min_staff || 1,
        shift_type: previewJson.shift_type || "regular",
        notes: previewJson.notes || null,
      };
    case "reassign_corrective_action":
    case "reassign_ca":
      return {
        ca_id: previewJson.ca_id,
        new_assigned_to: previewJson.new_assigned_to,
        new_assigned_name: previewJson.new_assigned_name,
        reason: previewJson.reason,
      };
    case "create_time_off_request":
      return {
        employee_id: previewJson.employee_id,
        employee_name: previewJson.employee_name,
        start_date: previewJson.start_date,
        end_date: previewJson.end_date,
        request_type: previewJson.request_type,
        reason: previewJson.reason,
      };
    case "approve_time_off_request":
      return {
        request_id: previewJson.request_id,
        employee_name: previewJson.employee_name,
      };
    default:
      return {};
  }
}

/** Resolve the canonical module code for logging purposes */
function resolveCanonicalModule(toolName: string): string {
  if (toolName.includes("time_off")) return "workforce";
  if (toolName.includes("audit")) return "location_audits";
  if (toolName.includes("employee") || toolName.includes("attendance") || toolName.includes("shift") || toolName.includes("training")) return "workforce";
  if (toolName.includes("corrective") || toolName.includes("ca_")) return "corrective_actions";
  if (toolName.includes("work_order")) return "cmms";
  if (toolName.includes("document")) return "documents";
  return "general";
}

// ─── Risk classification ────────────────────────────────────
const ACTION_RISK: Record<string, "low" | "medium" | "high"> = {
  create_employee_draft: "medium",
  create_audit_template_draft: "medium",
  create_shift_draft: "medium",
  execute_employee_creation: "medium",
  execute_audit_template_creation: "medium",
  execute_shift_creation: "medium",
  reassign_corrective_action: "high",
  execute_ca_reassignment: "high",
  create_time_off_request_draft: "medium",
  execute_time_off_request: "medium",
  approve_time_off_request_draft: "medium",
  execute_time_off_approval: "medium",
  reject_time_off_request_dash: "medium",
  cancel_time_off_request_dash: "medium",
};

// ─── Helpers ────────────────────────────────────────────────
function cap<T>(data: T[] | null, limit = MAX_TOOL_ROWS) {
  const items = data ?? [];
  const total = items.length;
  return { items: items.slice(0, limit), total, returned: Math.min(total, limit), truncated: total > limit };
}

/**
 * Downloads a file from Supabase Storage and returns it as base64 with its MIME type.
 * Handles signed URLs, public URLs, and direct storage paths.
 */
async function downloadFileAsBase64(
  sbService: any,
  fileUrl: string
): Promise<{ base64: string; mimeType: string }> {
  // Determine MIME type from URL/extension
  const urlPath = fileUrl.split("?")[0].toLowerCase();
  let mimeType = "application/octet-stream";
  if (urlPath.endsWith(".pdf")) mimeType = "application/pdf";
  else if (urlPath.endsWith(".png")) mimeType = "image/png";
  else if (urlPath.endsWith(".jpg") || urlPath.endsWith(".jpeg")) mimeType = "image/jpeg";
  else if (urlPath.endsWith(".gif")) mimeType = "image/gif";
  else if (urlPath.endsWith(".webp")) mimeType = "image/webp";
  else if (urlPath.endsWith(".csv")) mimeType = "text/csv";
  else if (urlPath.endsWith(".xlsx") || urlPath.endsWith(".xls")) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  // Try to parse as Supabase Storage URL and download via SDK
  const storageMarker = "/storage/v1/object/";
  if (fileUrl.includes(storageMarker)) {
    const urlParts = fileUrl.split(storageMarker);
    if (urlParts.length >= 2) {
      let bucketAndPath = urlParts[1].split("?")[0];
      // Remove "public/" or "sign/" prefix
      if (bucketAndPath.startsWith("public/")) bucketAndPath = bucketAndPath.substring(7);
      else if (bucketAndPath.startsWith("sign/")) bucketAndPath = bucketAndPath.substring(5);

      const segments = bucketAndPath.split("/");
      const bucket = segments[0];
      const path = decodeURIComponent(segments.slice(1).join("/"));

      console.log(`downloadFileAsBase64: bucket=${bucket}, path=${path}`);

      const { data, error } = await sbService.storage.from(bucket).download(path);
      if (error) {
        console.error("Storage download error:", error);
        throw new Error(`Could not download file from storage: ${error.message}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      return { base64, mimeType };
    }
  }

  // Fallback: direct HTTP fetch for external URLs
  console.log(`downloadFileAsBase64: fetching external URL`);
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch file: HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  // Try to get content-type from response
  const ct = resp.headers.get("content-type");
  if (ct) mimeType = ct.split(";")[0].trim();
  return { base64, mimeType };
}

async function utcRange(sb: any, from: string, to: string, tz = DEFAULT_TIMEZONE) {
  const { data, error } = await sb.rpc("tz_date_range_to_utc", { from_date: from, to_date: to, tz });
  if (error || !data?.[0]) return null;
  return { fromUtc: data[0].from_utc, toUtc: data[0].to_utc };
}

function generateSmartTitle(firstMessage: string): string {
  if (!firstMessage) return "Dash conversation";
  // Take the first sentence or first 60 chars, whichever is shorter
  const cleaned = firstMessage.replace(/\n/g, " ").trim();
  const sentenceEnd = cleaned.search(/[.!?]/);
  let title = sentenceEnd > 10 && sentenceEnd < 80 ? cleaned.substring(0, sentenceEnd) : cleaned.substring(0, 60);
  // Trim to last full word
  if (title.length >= 60) {
    const lastSpace = title.lastIndexOf(" ");
    if (lastSpace > 30) title = title.substring(0, lastSpace);
    title += "…";
  }
  return title || "Dash conversation";
}

function sanitizeInput(text: string): string {
  // Strip potential prompt injection markers
  return text
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/<system>/gi, "")
    .replace(/<\/system>/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "")
    .replace(/<\|assistant\|>/gi, "")
    .replace(/<\|user\|>/gi, "");
}

// ─── Structured Event Helpers ───────────────────────────────
function makeStructuredEvent(type: string, data: any): string {
  return JSON.stringify({ type: "structured_event", event_type: type, data });
}

// ─── Tool Definitions ───────────────────────────────────────
const tools = [
  // --- READ: Cross-module ---
  {
    type: "function",
    function: {
      name: "get_location_overview",
      description: "Get a high-level overview of a location: employee count, recent audit score, open CAs, pending tasks. Requires location name or ID.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name (partial match)" },
          location_id: { type: "string", description: "Location UUID (if known)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cross_module_summary",
      description: "Get a cross-module operational summary for a location or all locations over a date range. Covers: audits, tasks, attendance, CAs, work orders.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Employees ---
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "Search employees by name, phone, or email.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  // --- READ: Audits ---
  {
    type: "function",
    function: {
      name: "get_audit_results",
      description: "Get recent audit results (scores, templates used, locations) within a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location filter" },
          template_id: { type: "string", description: "Optional template filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_location_performance",
      description: "Compare audit performance across locations for a date range. If location_ids is omitted, compares ALL active company locations.",
      parameters: {
        type: "object",
        properties: {
          location_ids: { type: "array", items: { type: "string" }, description: "Location UUIDs to compare. If omitted, all active company locations are compared." },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Corrective Actions ---
  {
    type: "function",
    function: {
      name: "get_open_corrective_actions",
      description: "List open/in-progress corrective actions, optionally filtered by location or severity.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Tasks ---
  {
    type: "function",
    function: {
      name: "get_task_completion_summary",
      description: "Get task completion rates for a date range, optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Attendance ---
  {
    type: "function",
    function: {
      name: "get_attendance_exceptions",
      description: "Get attendance exceptions (late arrivals, missed checkouts, no-shows) for a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Work Orders ---
  {
    type: "function",
    function: {
      name: "get_work_order_status",
      description: "Get work order summary (open, in progress, completed) optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Documents ---
  {
    type: "function",
    function: {
      name: "get_document_expiries",
      description: "Get documents expiring soon or already expired.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Look-ahead days (default 30)" },
        },
      },
    },
  },
  // --- READ: Training ---
  {
    type: "function",
    function: {
      name: "get_training_gaps",
      description: "Identify employees with incomplete or overdue training assignments.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
        },
      },
    },
  },
  // --- SEARCH: Locations ---
  {
    type: "function",
    function: {
      name: "search_locations",
      description: "Search locations by name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text for location name" },
        },
        required: ["query"],
      },
    },
  },
  // --- FILE: Parse uploaded file ---
  {
    type: "function",
    function: {
      name: "parse_uploaded_file",
      description: "Parse an uploaded file (PDF, image, spreadsheet) to extract structured content. CRITICAL: When the user uploads ANY file (PDF, image, etc.) and asks to create an audit template, create an audit, or anything audit-related, you MUST call this tool with intent='audit_template'. For compliance/regulation documents, use intent='compliance_audit'. NEVER respond with text saying you cannot parse a file — ALWAYS call this tool instead.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "The signed URL of the uploaded file. Extract this from the [File URLs: ...] section in the user message." },
          file_name: { type: "string", description: "Original filename" },
          intent: { type: "string", enum: ["id_scan", "audit_template", "compliance_audit", "schedule_import", "document_parse", "general"], description: "What the user wants to do with the file. Use 'audit_template' for any audit template creation from a document. Use 'compliance_audit' for compliance/regulation documents." },
          regulation_name: { type: "string", description: "Name of the regulation/standard (only for compliance_audit intent)" },
          requested_template_name: { type: "string", description: "If the user explicitly specified a name for the audit template (e.g. 'name it TEST_Dash'), pass that exact name here. It will override the AI-extracted title." },
        },
        required: ["file_url", "file_name", "intent"],
      },
    },
  },
  // --- DRAFT: Create employee draft ---
  {
    type: "function",
    function: {
      name: "create_employee_draft",
      description: "Create an employee draft from extracted data (e.g., from an ID scan). Returns a preview for user approval before creating the actual employee record.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Employee full name" },
          cnp: { type: "string", description: "Romanian CNP (personal numeric code)" },
          date_of_birth: { type: "string", description: "Date of birth YYYY-MM-DD" },
          id_series: { type: "string", description: "ID card series" },
          id_number: { type: "string", description: "ID card number" },
          address: { type: "string", description: "Address from ID" },
          location_name: { type: "string", description: "Target location name" },
          role: { type: "string", description: "Job role/position" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        },
        required: ["full_name"],
      },
    },
  },
  // --- DRAFT: Create audit template draft ---
  {
    type: "function",
    function: {
      name: "create_audit_template_draft",
      description: "Create an audit template draft from extracted PDF content. Returns a structured preview with sections and fields for user approval.",
      parameters: {
        type: "object",
        properties: {
          template_name: { type: "string", description: "Name for the audit template" },
          description: { type: "string", description: "Template description" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      field_type: { type: "string", enum: ["yes_no", "rating", "text", "number", "checkbox", "photo"] },
                      is_required: { type: "boolean" },
                    },
                    required: ["name", "field_type"],
                  },
                },
              },
              required: ["name", "fields"],
            },
            description: "Template sections with fields",
          },
          recurrence: { type: "string", enum: ["daily", "weekly", "monthly", "none"], description: "Suggested recurrence" },
          target_locations: { type: "string", enum: ["all", "specific"], description: "Which locations to assign to" },
        },
        required: ["template_name", "sections"],
      },
    },
  },
  // --- WRITE: Execute approved employee creation ---
  {
    type: "function",
    function: {
      name: "execute_employee_creation",
      description: "Execute the creation of an employee record after user has approved the draft. Only call this when the user explicitly approves/confirms the employee draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the approval" },
          full_name: { type: "string" },
          cnp: { type: "string" },
          date_of_birth: { type: "string" },
          id_series: { type: "string" },
          id_number: { type: "string" },
          address: { type: "string" },
          location_id: { type: "string" },
          role: { type: "string" },
          start_date: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
        },
        required: ["full_name", "location_id", "role"],
      },
    },
  },
  // --- WRITE: Execute approved audit template creation ---
  {
    type: "function",
    function: {
      name: "execute_audit_template_creation",
      description: "Execute the creation of an audit template after user has approved the draft. Only call this when the user explicitly approves/confirms the template draft.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the approval" },
          template_name: { type: "string" },
          description: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      field_type: { type: "string" },
                      is_required: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["template_name", "sections"],
      },
    },
  },
  // --- WRITE: Reassign corrective action ---
  {
    type: "function",
    function: {
      name: "reassign_corrective_action",
      description: "Reassign a corrective action to a different user. Requires explicit user confirmation for high-risk changes.",
      parameters: {
        type: "object",
        properties: {
          corrective_action_id: { type: "string", description: "The CA ID to reassign" },
          new_assigned_to: { type: "string", description: "New assignee user ID" },
          new_assigned_name: { type: "string", description: "Name of new assignee (for confirmation)" },
          reason: { type: "string", description: "Reason for reassignment" },
        },
        required: ["corrective_action_id", "new_assigned_to"],
      },
    },
  },
  // --- EXECUTE: CA reassignment after approval ---
  {
    type: "function",
    function: {
      name: "execute_ca_reassignment",
      description: "Execute corrective action reassignment after user approves. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the reassignment draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- DRAFT: Create shift draft ---
  {
    type: "function",
    function: {
      name: "create_shift_draft",
      description: "Create a shift draft for user approval before creating. Shows preview of the shift.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string" },
          location_id: { type: "string" },
          role: { type: "string", description: "Role/position for the shift" },
          shift_date: { type: "string", description: "Date YYYY-MM-DD" },
          start_time: { type: "string", description: "Start time HH:MM" },
          end_time: { type: "string", description: "End time HH:MM" },
          min_staff: { type: "number", description: "Minimum staff needed" },
          max_staff: { type: "number", description: "Maximum staff" },
          employee_name: { type: "string", description: "Full name of the employee to assign to this shift" },
          employee_id: { type: "string", description: "Employee ID to assign (if known)" },
        },
        required: ["role", "shift_date", "start_time", "end_time"],
      },
    },
  },
  // --- EXECUTE: Shift creation after approval ---
  {
    type: "function",
    function: {
      name: "execute_shift_creation",
      description: "Execute shift creation after user approves the draft. Only call after explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID from the shift draft" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  // --- MEMORY: User preferences ---
  {
    type: "function",
    function: {
      name: "save_user_preference",
      description: "Save a user preference (e.g., preferred report format, default time window, favorite locations). Use when the user says 'remember that...', 'always use...', 'my default is...'.",
      parameters: {
        type: "object",
        properties: {
          preference_key: { type: "string", description: "Key name: 'report_format', 'default_time_window', 'favorite_locations', 'preferred_language', or custom key" },
          preference_value: { type: "object", description: "The preference value as a JSON object" },
        },
        required: ["preference_key", "preference_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_preferences",
      description: "Get all saved user preferences. Use to personalize responses (e.g., default date ranges, report format).",
      parameters: { type: "object", properties: {} },
    },
  },
  // --- MEMORY: Organization memory ---
  {
    type: "function",
    function: {
      name: "save_org_memory",
      description: "Save organization-level knowledge (terminology, standard processes, notes). Use when the user says 'we call X as Y', 'our standard process is...', 'note that...'.",
      parameters: {
        type: "object",
        properties: {
          memory_type: { type: "string", enum: ["terminology", "process", "standard", "note"], description: "Type of memory" },
          memory_key: { type: "string", description: "Short key identifier" },
          content: { type: "object", description: "The memory content as JSON" },
        },
        required: ["memory_type", "memory_key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_org_memory",
      description: "Retrieve organization memory entries. Use to understand company-specific terminology and processes.",
      parameters: {
        type: "object",
        properties: {
          memory_type: { type: "string", enum: ["terminology", "process", "standard", "note"], description: "Filter by type" },
        },
      },
    },
  },
  // --- WORKFLOW: Save/list workflows ---
  {
    type: "function",
    function: {
      name: "save_workflow",
      description: "Save the current conversation as a reusable workflow shortcut. Use when user says 'save this as a workflow', 'remember this report', 'make this a shortcut'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name for the workflow" },
          description: { type: "string", description: "What this workflow does" },
          prompt: { type: "string", description: "The prompt that triggers this workflow" },
          is_shared: { type: "boolean", description: "Whether other company users can see this workflow" },
        },
        required: ["name", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_saved_workflows",
      description: "List all saved workflow shortcuts for the user.",
      parameters: { type: "object", properties: {} },
    },
  },
  // --- FILE: Spreadsheet to schedule import ---
  {
    type: "function",
    function: {
      name: "transform_spreadsheet_to_schedule",
      description: "Parse an uploaded spreadsheet (CSV/Excel) and extract schedule data (shifts, assignments). Use when user uploads a spreadsheet intending to import a schedule.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "Signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
        },
        required: ["file_url", "file_name"],
      },
    },
  },
  // --- FILE: SOP to training module ---
  {
    type: "function",
    function: {
      name: "transform_sop_to_training",
      description: "Parse an uploaded SOP/procedure document and extract it as a training module draft with sections, key points, and quiz questions.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "Signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
          module_name: { type: "string", description: "Name for the training module" },
        },
        required: ["file_url", "file_name"],
      },
    },
  },
  // ─── TIME-OFF: Capability Layer Tools ───
  {
    type: "function",
    function: {
      name: "get_time_off_balance",
      description: "Get vacation/leave balance for an employee: total days, used, remaining.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name (partial match)" },
          employee_id: { type: "string", description: "Employee UUID (if known)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_time_off_requests",
      description: "List time-off/vacation/sick leave requests with optional filters by employee, status, or date range.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Filter by employee name" },
          status: { type: "string", enum: ["pending", "approved", "rejected"], description: "Filter by status" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_time_off_approvals",
      description: "List all pending time-off requests awaiting approval across the company.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "check_time_off_conflicts",
      description: "Check if a proposed time-off period would conflict with existing requests or team schedules.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["start_date", "end_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_time_off_calendar",
      description: "Get who is off during a date range, optionally filtered by location. Useful for 'who is off next Friday?' questions.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Filter by location name" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_time_off_request_draft",
      description: "Create a time-off request draft for approval. Use for vacation, sick leave, personal days.",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
          request_type: { type: "string", enum: ["vacation", "sick", "personal", "unpaid", "other"], description: "Type of leave" },
          reason: { type: "string", description: "Optional reason" },
        },
        required: ["start_date", "end_date", "request_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_time_off_request",
      description: "Execute time-off request creation after user approval.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_time_off_request_draft",
      description: "Create a draft to approve a pending time-off request. Shows impact preview.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
          employee_name: { type: "string", description: "Employee name (resolves most recent pending request)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_time_off_approval",
      description: "Execute time-off approval after user confirms.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The pending action ID" },
        },
        required: ["pending_action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_time_off_request_dash",
      description: "Reject a pending time-off request with optional reason.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
          employee_name: { type: "string", description: "Employee name" },
          rejection_reason: { type: "string", description: "Reason for rejection" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_time_off_request_dash",
      description: "Cancel a time-off request (delete). Employee can cancel own, managers can cancel any.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Time-off request UUID" },
        },
        required: ["request_id"],
      },
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────────
async function executeTool(
  sb: any, sbService: any, name: string, args: any, 
  companyId: string, userId: string, role: string, activeModules: string[],
  structuredEvents: string[]
): Promise<any> {
  // Module gating check
  const requiredModule = TOOL_MODULE_MAP[name];
  if (requiredModule && !activeModules.includes(requiredModule)) {
    return { error: `The "${requiredModule}" module is not active for your company. Please enable it in Billing & Modules.`, recoverable: false };
  }

  try {
    return await executeToolInner(sb, sbService, name, args, companyId, userId, role, activeModules, structuredEvents);
  } catch (err: any) {
    console.error(`[Dash] Tool "${name}" error:`, err);
    return { error: `Tool "${name}" failed: ${err.message || "Unknown error"}. You may retry this request.`, recoverable: true };
  }
}

async function executeToolInner(
  sb: any, sbService: any, name: string, args: any,
  companyId: string, userId: string, role: string, activeModules: string[],
  structuredEvents: string[]
): Promise<any> {
  switch (name) {
    // ────────── READ TOOLS (unchanged) ──────────
    case "search_locations": {
      const { data, error } = await sb.from("locations").select("id, name, address").ilike("name", `%${args.query}%`).limit(10);
      if (error) return { error: error.message };
      return { locations: data };
    }

    case "search_employees": {
      const limit = Math.min(args.limit || 10, MAX_TOOL_ROWS);
      const term = `%${args.query}%`;
      const { data, error } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)")
        .or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`).limit(limit);
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, employees: data?.map((e: any) => ({ id: e.id, name: e.full_name, role: e.role, status: e.status, location: e.locations?.name })) };
    }

    case "get_location_overview": {
      let locationId = args.location_id;
      let locationName = args.location_name;
      if (!locationId && locationName) {
        const { data } = await sb.from("locations").select("id, name").ilike("name", `%${locationName}%`).limit(1);
        if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
        else return { error: `No location found matching "${locationName}"` };
      }
      if (!locationId) return { error: "Please provide a location name or ID" };

      const [empRes, auditRes, caRes, taskRes] = await Promise.all([
        sb.from("employees").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "active"),
        sb.from("location_audits").select("overall_score").eq("location_id", locationId).in("status", AUDIT_FINISHED_STATUSES).not("overall_score", "is", null).order("audit_date", { ascending: false }).limit(1),
        sb.from("corrective_actions").select("id", { count: "exact", head: true }).eq("location_id", locationId).in("status", ["open", "in_progress"]),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("location_id", locationId),
      ]);
      return {
        location: { id: locationId, name: locationName },
        employees_active: empRes.count ?? 0,
        latest_audit_score: auditRes.data?.[0]?.overall_score ?? null,
        open_corrective_actions: caRes.count ?? 0,
        total_tasks: taskRes.count ?? 0,
      };
    }

    case "get_cross_module_summary": {
      const ur = await utcRange(sb, args.from, args.to);
      const locationFilter = args.location_id;

      let auditQ = sb.from("location_audits").select("id, overall_score, status, location_id, locations(name)").gte("audit_date", args.from).lte("audit_date", args.to);
      if (locationFilter) auditQ = auditQ.eq("location_id", locationFilter);
      const { data: audits } = await auditQ.limit(200);

      const finishedAudits = (audits ?? []).filter((a: any) => AUDIT_FINISHED_STATUSES.includes(a.status));
      const scoredAudits = finishedAudits.filter((a: any) => a.overall_score != null && a.overall_score > 0);
      const avgScore = scoredAudits.length > 0 ? Math.round(scoredAudits.reduce((s: number, a: any) => s + a.overall_score, 0) / scoredAudits.length) : null;

      let caQ = sb.from("corrective_actions").select("id, severity, status, location_id").in("status", ["open", "in_progress"]);
      if (locationFilter) caQ = caQ.eq("location_id", locationFilter);
      const { data: cas } = await caQ.limit(200);

      let attQ = sb.from("attendance_logs").select("id, is_late, late_minutes, auto_clocked_out, check_out_at");
      if (ur) attQ = attQ.gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc);
      if (locationFilter) attQ = attQ.eq("location_id", locationFilter);
      const { data: attLogs } = await attQ.limit(1000);

      const lateCount = (attLogs ?? []).filter((l: any) => l.is_late).length;
      const noCheckout = (attLogs ?? []).filter((l: any) => !l.check_out_at && !l.auto_clocked_out).length;

      let woQ = sb.from("cmms_work_orders").select("id, status, priority");
      if (locationFilter) woQ = woQ.eq("location_id", locationFilter);
      const { data: wos } = await woQ.in("status", ["open", "in_progress"]).limit(200);

      return {
        date_range: { from: args.from, to: args.to },
        location_id: locationFilter ?? "all",
        audits: { total: (audits ?? []).length, finished: finishedAudits.length, scored: scoredAudits.length, avg_score: avgScore },
        corrective_actions: { open: (cas ?? []).filter((c: any) => c.status === "open").length, in_progress: (cas ?? []).filter((c: any) => c.status === "in_progress").length, by_severity: { critical: (cas ?? []).filter((c: any) => c.severity === "critical").length, high: (cas ?? []).filter((c: any) => c.severity === "high").length } },
        attendance: { total_logs: (attLogs ?? []).length, late_arrivals: lateCount, missing_checkouts: noCheckout },
        work_orders: { open: (wos ?? []).filter((w: any) => w.status === "open").length, in_progress: (wos ?? []).filter((w: any) => w.status === "in_progress").length },
      };
    }

    case "get_audit_results": {
      const limit = Math.min(args.limit || 20, MAX_TOOL_ROWS);
      let q = sb.from("location_audits").select("id, overall_score, status, audit_date, location_id, locations(name), template_id, audit_templates(name)")
        .in("status", AUDIT_FINISHED_STATUSES).gte("audit_date", args.from).lte("audit_date", args.to).order("audit_date", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.template_id) q = q.eq("template_id", args.template_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      const audits = c.items.map((a: any) => ({ id: a.id, score: a.overall_score, status: a.status, audit_date: a.audit_date, location: a.locations?.name, template: a.audit_templates?.name }));
      if (audits.length > 0) {
        structuredEvents.push(makeStructuredEvent("data_table", {
          title: `Audit Results (${args.from} — ${args.to})`,
          columns: ["Date", "Location", "Template", "Score", "Status"],
          rows: audits.map((a: any) => [a.audit_date, a.location ?? "—", a.template ?? "—", a.score ?? "—", a.status]),
        }));
      }
      return { ...c, audits };
    }

    case "compare_location_performance": {
      // Auto-load all active company locations if location_ids not provided
      let locationIds: string[] = args.location_ids ?? [];
      if (locationIds.length === 0) {
        const { data: allLocs } = await sb.from("locations").select("id").eq("status", "active").eq("company_id", companyId).limit(100);
        locationIds = (allLocs ?? []).map((l: any) => l.id);
      }
      if (locationIds.length === 0) return { error: "No active locations found for your company." };

      const results: any[] = [];
      const noDataLocations: string[] = [];
      for (const locId of locationIds) {
        const { data } = await sb.from("location_audits").select("overall_score, locations(name)").eq("location_id", locId).in("status", AUDIT_FINISHED_STATUSES).gte("audit_date", args.from).lte("audit_date", args.to);
        const scores = (data ?? []).map((a: any) => a.overall_score).filter((s: any) => s != null && s > 0);
        const locName = data?.[0]?.locations?.name ?? locId;
        if (scores.length === 0) {
          noDataLocations.push(locName);
        } else {
          results.push({ location_id: locId, location_name: locName, audit_count: scores.length, avg_score: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length), min_score: Math.min(...scores), max_score: Math.max(...scores) });
        }
      }
      results.sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
      if (results.length > 0) {
        structuredEvents.push(makeStructuredEvent("data_table", {
          title: `Location Audit Comparison (${args.from} — ${args.to})`,
          columns: ["Location", "Avg Score", "Audits", "Min", "Max"],
          rows: results.map((r: any) => [r.location_name, r.avg_score, r.audit_count, r.min_score, r.max_score]),
        }));
      }
      return { date_range: { from: args.from, to: args.to }, comparisons: results, locations_with_no_scored_audits: noDataLocations };
    }

    case "get_open_corrective_actions": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      let q = sb.from("corrective_actions").select("id, title, severity, status, due_at, created_at, location_id, locations(name), assigned_to")
        .in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.severity) q = q.eq("severity", args.severity);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_at: ca.due_at, location: ca.locations?.name, assigned_to: ca.assigned_to })) };
    }

    case "get_task_completion_summary": {
      let q = sb.from("task_completions").select("id, completed_at, task_id, tasks(title, location_id, locations(name))").gte("completed_at", args.from).lte("completed_at", args.to + "T23:59:59Z");
      if (args.location_id) q = q.eq("tasks.location_id", args.location_id);
      const { data, error } = await q.limit(500);
      if (error) return { error: error.message };
      return { date_range: { from: args.from, to: args.to }, completions_count: (data ?? []).length };
    }

    case "get_attendance_exceptions": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      const ur2 = await utcRange(sb, args.from, args.to);
      if (!ur2) return { error: "Failed to convert date range" };
      let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
        .gte("check_in_at", ur2.fromUtc).lt("check_in_at", ur2.toUtc)
        .or("is_late.eq.true,check_out_at.is.null").order("check_in_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, exceptions: c.items.map((l: any) => ({ id: l.id, employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at, is_late: l.is_late, late_minutes: l.late_minutes, auto_clocked_out: l.auto_clocked_out, location: l.locations?.name })) };
    }

    case "get_work_order_status": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      let q = sb.from("cmms_work_orders").select("id, title, status, priority, created_at, location_id, locations(name)").order("created_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.status) q = q.eq("status", args.status);
      else q = q.in("status", ["open", "in_progress"]);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, work_orders: c.items.map((w: any) => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, location: w.locations?.name })) };
    }

    case "get_document_expiries": {
      const daysAhead = args.days_ahead || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + daysAhead);
      const { data, error } = await sb.from("documents").select("id, title, expiry_date, status").not("expiry_date", "is", null).lte("expiry_date", cutoff.toISOString()).order("expiry_date", { ascending: true }).limit(50);
      if (error) return { error: error.message };
      return { days_ahead: daysAhead, documents: (data ?? []).map((d: any) => ({ id: d.id, title: d.title, expiry_date: d.expiry_date, expired: new Date(d.expiry_date) < new Date() })) };
    }

    case "get_training_gaps": {
      let q = sb.from("training_assignments").select("id, employee_id, employees(full_name, location_id, locations(name)), training_module_id, training_modules(title), status, due_date")
        .in("status", ["assigned", "in_progress"]);
      if (args.location_id) q = q.eq("employees.location_id", args.location_id);
      const { data, error } = await q.limit(100);
      if (error) return { error: error.message };
      const overdue = (data ?? []).filter((a: any) => a.due_date && new Date(a.due_date) < new Date());
      return { total_incomplete: (data ?? []).length, overdue_count: overdue.length, gaps: (data ?? []).map((a: any) => ({ employee: a.employees?.full_name, module: a.training_modules?.title, status: a.status, due_date: a.due_date, location: a.employees?.locations?.name })) };
    }

    // ────────── FILE TOOLS ──────────
    case "parse_uploaded_file": {
      const { file_url, file_name, intent, requested_template_name } = args;
      if (!file_url) return { error: "No file URL provided" };

      try {
        if (intent === "id_scan") {
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
          const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/scan-id-document`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
            body: JSON.stringify({ imageUrl: file_url }),
          });
          if (!scanResp.ok) return { error: "Failed to scan ID document. Please ensure the image is clear and readable." };
          const scanResult = await scanResp.json();
          return { type: "id_scan_result", file_name, extracted_data: scanResult, confidence: "medium", next_step: "Review the extracted data and call create_employee_draft with the confirmed fields." };
        }

        if (intent === "audit_template" || intent === "compliance_audit") {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
          // Download file server-side and send as base64 inline data
          let fileContent: { base64: string; mimeType: string };
          try {
            console.log(`[parse_uploaded_file] Downloading file: ${file_url}`);
            fileContent = await downloadFileAsBase64(sbService, file_url);
            console.log(`[parse_uploaded_file] Downloaded OK, mimeType=${fileContent.mimeType}, base64 length=${fileContent.base64.length}`);
          } catch (dlErr: any) {
            console.error("[parse_uploaded_file] File download failed:", dlErr);
            return { error: "Could not access the uploaded file. Please try re-uploading." };
          }

          const isCompliance = intent === "compliance_audit";
          const extractionPrompt = isCompliance
            ? `Analyze this compliance/regulation document and create a recurring audit template that covers its requirements. Return a JSON object with: { template_name: string, description: string, regulation_reference: string, suggested_recurrence: "daily"|"weekly"|"monthly", sections: [{ name: string, fields: [{ name: string, field_type: "yes_no"|"rating"|"text"|"number"|"checkbox"|"photo", is_required: boolean, regulation_clause?: string }] }] }. Only return valid JSON, no markdown fences.`
            : `Analyze this document and extract it as a structured audit template. Return a JSON object with: template_name (string), description (string), sections (array of { name: string, fields: array of { name: string, field_type: "yes_no"|"rating"|"text"|"number"|"checkbox"|"photo", is_required: boolean } }). Only return valid JSON, no markdown fences.`;

          // Use data URI format for the AI gateway
          const fileDataUri = `data:${fileContent.mimeType};base64,${fileContent.base64}`;

          // AbortController with 60s timeout to prevent stalling on large files
          const parseAbort = new AbortController();
          const parseTimeout = setTimeout(() => parseAbort.abort(), 60_000);
          let parseResp: Response;
          try {
            parseResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: extractionPrompt },
                    { type: "image_url", image_url: { url: fileDataUri } },
                  ],
                }],
                stream: false,
              }),
              signal: parseAbort.signal,
            });
          } catch (fetchErr: any) {
            clearTimeout(parseTimeout);
            if (fetchErr.name === "AbortError") {
              console.error("[parse_uploaded_file] AI parsing timed out after 60s");
              return { error: "Document parsing timed out. The file may be too large or complex. Please try a smaller file or split the document." };
            }
            throw fetchErr;
          } finally {
            clearTimeout(parseTimeout);
          }
          if (!parseResp.ok) {
            const errText = await parseResp.text();
            console.error("[parse_uploaded_file] AI parse error:", parseResp.status, errText);
            return { error: `Failed to parse document (status ${parseResp.status}). The AI service could not process this file format. Please try a different file or re-upload.` };
          }
          const parseResult = await parseResp.json();
          const content = parseResult.choices?.[0]?.message?.content || "";
          console.log(`[parse_uploaded_file] AI response length: ${content.length}`);
          let templateData: any = null;
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) templateData = JSON.parse(jsonMatch[0]);
          } catch (parseErr) {
            console.error("[parse_uploaded_file] JSON parse error:", parseErr);
            return { raw_extraction: content.substring(0, 2000), error: "Could not parse structured data from document. Raw text extracted." };
          }
          if (!templateData) {
            return { raw_extraction: content.substring(0, 2000), error: "No structured template found in document. Raw text extracted." };
          }
          if (isCompliance && args.regulation_name) {
            templateData.regulation_reference = args.regulation_name;
          }

          // ─── Auto-create pending action for audit intents (merge extraction + draft) ───
          const templateName = requested_template_name || templateData.template_name || templateData.name || file_name.replace(/\.[^.]+$/, "");
          const sectionCount = templateData.sections?.length || 0;
          const fieldCount = templateData.sections?.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0) || 0;

          const draft = {
            name: templateName,
            description: templateData.description || null,
            sections: templateData.sections || [],
            recurrence: templateData.suggested_recurrence || "none",
            target_locations: "all",
            regulation_reference: templateData.regulation_reference || null,
          };

          const { data: paData } = await sbService.from("dash_pending_actions").insert({
            company_id: companyId,
            user_id: userId,
            action_name: "create_audit_template",
            action_type: "write",
            risk_level: "medium",
            preview_json: draft,
            status: "pending",
          }).select("id").single();
          const pendingActionId = paData?.id || null;

          structuredEvents.push(makeStructuredEvent("action_preview", {
            action: "Create Audit Template",
            summary: `"${templateName}" with ${sectionCount} sections, ${fieldCount} fields. Extracted from "${file_name}".`,
            risk: "medium",
            affected: [`${sectionCount} sections`, `${fieldCount} fields`, draft.recurrence === "none" ? "no recurrence" : draft.recurrence],
            pending_action_id: pendingActionId,
            draft,
            can_approve: true,
          }));

          const resultType = isCompliance ? "compliance_audit_extraction" : "audit_template_extraction";
          return {
            type: resultType,
            file_name,
            extracted_template: templateData,
            pending_action_id: pendingActionId,
            requires_approval: true,
            risk_level: "medium",
            message: `Audit template "${templateName}" extracted and draft created (${sectionCount} sections, ${fieldCount} fields). The user can approve to finalize.`,
          };
        }

        return { type: "general_parse", file_name, message: `File "${file_name}" received. Please specify what you'd like to do with it.` };
      } catch (err: any) {
        return { error: `File processing failed: ${err.message}` };
      }
    }

    // ────────── DRAFT TOOLS ──────────
    case "create_employee_draft": {
      let locationId = null;
      if (args.location_name) {
        const { data: locData } = await sb.from("locations").select("id, name").ilike("name", `%${args.location_name}%`).limit(1);
        if (locData?.[0]) locationId = locData[0].id;
      }

      const draft = {
        full_name: args.full_name,
        cnp: args.cnp || null,
        date_of_birth: args.date_of_birth || null,
        id_series: args.id_series || null,
        id_number: args.id_number || null,
        address: args.address || null,
        location_id: locationId,
        location_name: args.location_name || null,
        role: args.role || null,
        start_date: args.start_date || null,
        phone: args.phone || null,
        email: args.email || null,
      };

      const missing: string[] = [];
      if (!draft.full_name) missing.push("full_name");
      if (!draft.location_name && !draft.location_id) missing.push("location (which location?)");
      if (!draft.role) missing.push("role/position");

      // Store pending action in database
      let pendingActionId: string | null = null;
      if (missing.length === 0) {
        const { data: paData } = await sbService.from("dash_pending_actions").insert({
          company_id: companyId,
          user_id: userId,
          action_name: "create_employee",
          action_type: "write",
          risk_level: "medium",
          preview_json: draft,
          status: "pending",
        }).select("id").single();
        pendingActionId = paData?.id || null;
      }

      // Emit structured action preview event
      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: "Create Employee",
        summary: missing.length > 0
          ? `Draft for "${draft.full_name}" — missing: ${missing.join(", ")}`
          : `Create "${draft.full_name}" at ${draft.location_name || "location"} as ${draft.role}`,
        risk: "medium",
        affected: [draft.full_name, draft.location_name, draft.role].filter(Boolean),
        pending_action_id: pendingActionId,
        draft,
        missing_fields: missing,
        can_approve: missing.length === 0,
      }));

      return {
        type: "employee_draft",
        draft,
        missing_fields: missing,
        pending_action_id: pendingActionId,
        requires_approval: true,
        risk_level: "medium",
        message: missing.length > 0
          ? `Draft created but missing: ${missing.join(", ")}. Please provide these to proceed.`
          : `Employee draft ready for "${draft.full_name}". A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
      };
    }

    case "create_audit_template_draft": {
      const sectionCount = args.sections?.length || 0;
      const fieldCount = args.sections?.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0) || 0;

      const draft = {
        name: args.template_name,
        description: args.description || null,
        sections: args.sections,
        recurrence: args.recurrence || "none",
        target_locations: args.target_locations || "all",
      };

      // Store pending action
      const { data: paData } = await sbService.from("dash_pending_actions").insert({
        company_id: companyId,
        user_id: userId,
        action_name: "create_audit_template",
        action_type: "write",
        risk_level: "medium",
        preview_json: draft,
        status: "pending",
      }).select("id").single();
      const pendingActionId = paData?.id || null;

      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: "Create Audit Template",
        summary: `"${args.template_name}" with ${sectionCount} sections, ${fieldCount} fields. Recurrence: ${args.recurrence || "none"}`,
        risk: "medium",
        affected: [`${sectionCount} sections`, `${fieldCount} fields`, args.recurrence || "no recurrence"],
        pending_action_id: pendingActionId,
        draft,
        can_approve: true,
      }));

      return {
        type: "audit_template_draft",
        draft,
        pending_action_id: pendingActionId,
        summary: { sections: sectionCount, total_fields: fieldCount, recurrence: args.recurrence || "none", target: args.target_locations || "all locations" },
        requires_approval: true,
        risk_level: "medium",
        message: `Audit template "${args.template_name}" draft ready (ID: ${pendingActionId}). User can approve to create.`,
      };
    }

    case "create_shift_draft": {
      let locationId = args.location_id;
      let locationName = args.location_name;
      if (!locationId && locationName) {
        const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(5);
        if (data?.length === 1) { locationId = data[0].id; locationName = data[0].name; }
        else if (data && data.length > 1) {
          const candidates = data.map((l: any) => l.name);
          structuredEvents.push(makeStructuredEvent("clarification", {
            question: `Multiple locations match "${locationName}". Which one?`,
            options: candidates,
          }));
          return { action: "Create Shift", summary: `Multiple locations match "${locationName}". Please select.`, risk: "medium", can_approve: false, missing_fields: ["location"], requires_approval: true, message: `Found ${data.length} locations matching "${locationName}". Please clarify.` };
        }
      }

      // ─── Server-side date resolution (Europe/Bucharest) ───
      const nowBucharest = new Date().toLocaleString("en-CA", { timeZone: "Europe/Bucharest" }).split(",")[0]; // YYYY-MM-DD
      let resolvedDate = args.shift_date;
      if (!resolvedDate || resolvedDate === "today") {
        resolvedDate = nowBucharest;
      } else if (resolvedDate === "tomorrow") {
        const tom = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
        tom.setDate(tom.getDate() + 1);
        resolvedDate = tom.toISOString().split("T")[0];
      } else {
        // Guard: reject dates more than 1 year in the past (stale context protection)
        const parsed = new Date(resolvedDate);
        const now = new Date();
        if (!isNaN(parsed.getTime())) {
          const diffMs = now.getTime() - parsed.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays > 365) {
            // Stale date detected — override to today
            console.warn(`[Dash] Stale shift_date "${resolvedDate}" detected (${Math.round(diffDays)} days old), overriding to today: ${nowBucharest}`);
            resolvedDate = nowBucharest;
          }
        }
      }

      // Resolve employee by name if provided
      let employeeId = args.employee_id || null;
      let employeeName = args.employee_name || null;
      if (employeeName && !employeeId) {
        // Try exact ilike match first
        const { data: empData } = await sb.from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .ilike("full_name", `%${employeeName}%`)
          .limit(5);
        
        if (empData && empData.length === 1) {
          employeeId = empData[0].id;
          employeeName = empData[0].full_name;
        } else if (empData && empData.length > 1) {
          const candidates = empData.map((e: any) => e.full_name);
          structuredEvents.push(makeStructuredEvent("clarification", {
            question: `Multiple employees match "${args.employee_name}". Which one did you mean?`,
            options: candidates,
          }));
          return { action: "Create Shift", summary: `Multiple employees match "${args.employee_name}". Please select one.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Found ${empData.length} employees matching "${args.employee_name}". Please clarify.` };
        } else {
          // No match — try token-reversed match
          const tokens = employeeName.trim().split(/\s+/);
          let found = false;
          if (tokens.length >= 2) {
            for (const token of tokens) {
              if (token.length < 2) continue;
              const { data: tokenData } = await sb.from("employees")
                .select("id, full_name")
                .eq("company_id", companyId)
                .ilike("full_name", `%${token}%`)
                .limit(5);
              if (tokenData && tokenData.length === 1) {
                employeeId = tokenData[0].id;
                employeeName = tokenData[0].full_name;
                found = true;
                break;
              } else if (tokenData && tokenData.length > 1) {
                const candidates = tokenData.map((e: any) => e.full_name);
                structuredEvents.push(makeStructuredEvent("clarification", {
                  question: `No exact match for "${args.employee_name}". Did you mean one of these?`,
                  options: candidates,
                }));
                return { action: "Create Shift", summary: `Could not find exact match for "${args.employee_name}". Please select from candidates.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Found possible matches for "${args.employee_name}". Please clarify.` };
              }
            }
          }
          if (!found) {
            return { action: "Create Shift", summary: `Employee "${args.employee_name}" not found in this company. Please provide a valid employee name.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Could not find employee "${args.employee_name}". Please check the name and try again, or ask me to list employees.` };
          }
        }
      }

      const draft = {
        location_id: locationId,
        location_name: locationName || null,
        role: args.role,
        shift_date: resolvedDate,
        start_time: args.start_time,
        end_time: args.end_time,
        min_staff: args.min_staff || 1,
        max_staff: args.max_staff || 1,
        employee_id: employeeId,
        employee_name: employeeName,
      };

      const missing: string[] = [];
      if (!locationId) missing.push("location");
      if (!draft.role) missing.push("role");
      if (!draft.shift_date) missing.push("shift_date");

      let pendingActionId: string | null = null;
      if (missing.length === 0) {
        const { data: paData } = await sbService.from("dash_pending_actions").insert({
          company_id: companyId,
          user_id: userId,
          action_name: "create_shift",
          action_type: "write",
          risk_level: "medium",
          preview_json: draft,
          status: "pending",
        }).select("id").single();
        pendingActionId = paData?.id || null;
      }

      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: "Create Shift",
        summary: `${draft.role} at ${locationName || "?"} on ${draft.shift_date} ${draft.start_time}-${draft.end_time}${employeeName ? ` → ${employeeName}` : ""}`,
        risk: "medium",
        affected: [locationName, draft.role, draft.shift_date, employeeName].filter(Boolean),
        pending_action_id: pendingActionId,
        draft,
        missing_fields: missing,
        can_approve: missing.length === 0,
      }));

      return {
        type: "shift_draft",
        draft,
        missing_fields: missing,
        pending_action_id: pendingActionId,
        requires_approval: true,
        risk_level: "medium",
        message: missing.length > 0
          ? `Shift draft missing: ${missing.join(", ")}.`
          : `Shift draft ready. User can approve to create.`,
      };
    }

    // ────────── WRITE/EXECUTE TOOLS ──────────
    case "execute_employee_creation": {
      // Self-hydrate from pending action if args are missing critical fields
      if (args.pending_action_id && !args.full_name) {
        const { data: pa } = await sbService.from("dash_pending_actions")
          .select("id, status, company_id, preview_json")
          .eq("id", args.pending_action_id)
          .maybeSingle();
        if (pa && pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
        if (pa && pa.status !== "pending") return { error: `Action already ${pa.status}.` };
        if (pa?.preview_json) {
          const preview = pa.preview_json as any;
          args = { ...args, ...hydrateArgsFromDraft("create_employee", preview) };
        }
      } else if (args.pending_action_id) {
        // Validate pending action even if args are present
        const { data: pa } = await sbService.from("dash_pending_actions")
          .select("id, status, company_id")
          .eq("id", args.pending_action_id)
          .maybeSingle();
        if (pa && pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
        if (pa && pa.status !== "pending") return { error: `Action already ${pa.status}.` };
      }

      // Create employee
      const { data: empData, error: empError } = await sbService.from("employees").insert({
        company_id: companyId,
        full_name: args.full_name,
        role: args.role || "staff",
        location_id: args.location_id,
        status: "active",
        start_date: args.start_date || null,
        phone: args.phone || null,
        email: args.email || null,
        cnp: args.cnp || null,
        date_of_birth: args.date_of_birth || null,
        id_series: args.id_series || null,
        id_number: args.id_number || null,
        address: args.address || null,
      }).select("id, full_name").single();

      if (empError) {
        // Update pending action as failed
        if (args.pending_action_id) {
          await sbService.from("dash_pending_actions")
            .update({ status: "failed", execution_result: { error: empError.message }, updated_at: new Date().toISOString() })
            .eq("id", args.pending_action_id);
        }

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "error",
          title: "Employee Creation Failed",
          summary: empError.message,
          errors: [empError.message],
        }));
        return { error: `Failed to create employee: ${empError.message}` };
      }

      // Update pending action as executed
      if (args.pending_action_id) {
        await sbService.from("dash_pending_actions")
          .update({
            status: "executed",
            approved_at: new Date().toISOString(),
            approved_by: userId,
            execution_result: { employee_id: empData.id, employee_name: empData.full_name },
            updated_at: new Date().toISOString(),
          })
          .eq("id", args.pending_action_id);
      }

      // Log action
      await sbService.from("dash_action_log").insert({
        company_id: companyId,
        user_id: userId,
        action_type: "write",
        action_name: "create_employee",
        risk_level: "medium",
        request_json: args,
        result_json: { employee_id: empData.id },
        status: "success",
        approval_status: "approved",
        entities_affected: [empData.id],
        modules_touched: ["workforce"],
      });

      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: "success",
        title: "Employee Created",
        summary: `${empData.full_name} has been created successfully.`,
        changes: [`Employee "${empData.full_name}" created (ID: ${empData.id})`],
      }));

      return {
        type: "employee_created",
        employee_id: empData.id,
        employee_name: empData.full_name,
        message: `Employee "${empData.full_name}" created successfully.`,
      };
    }

    case "execute_audit_template_creation": {
      // Self-hydrate from pending action if args are missing
      let templateName = args.template_name;
      let templateDescription = args.description;
      let templateSections = args.sections;

      if (args.pending_action_id) {
        const { data: pa } = await sbService.from("dash_pending_actions")
          .select("id, status, company_id, preview_json")
          .eq("id", args.pending_action_id)
          .maybeSingle();
        if (pa && pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
        if (pa && pa.status !== "pending") return { error: `Action already ${pa.status}.` };

        // Hydrate from preview_json if direct args are missing
        if (pa?.preview_json && (!templateName || !templateSections)) {
          const preview = pa.preview_json as any;
          templateName = templateName || preview.name || preview.template_name;
          templateDescription = templateDescription || preview.description;
          templateSections = templateSections || preview.sections;
        }
      }

      if (!templateName) {
        return { error: "Template name is required but was not provided." };
      }

      // Create template
      const { data: tmplData, error: tmplError } = await sbService.from("audit_templates").insert({
        company_id: companyId,
        name: templateName,
        description: templateDescription || null,
        template_type: "location",
        is_active: true,
        is_global: true,
        created_by: userId,
      }).select("id, name").single();

      if (tmplError) {
        if (args.pending_action_id) {
          await sbService.from("dash_pending_actions")
            .update({ status: "failed", execution_result: { error: tmplError.message }, updated_at: new Date().toISOString() })
            .eq("id", args.pending_action_id);
        }
        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "error",
          title: "Template Creation Failed",
          summary: tmplError.message,
          errors: [tmplError.message],
        }));
        return { error: `Failed to create template: ${tmplError.message}` };
      }

      // Create sections and fields
      let sectionErrors: string[] = [];
      for (let si = 0; si < (templateSections || []).length; si++) {
        const sec = templateSections[si];
        const { data: secData, error: secError } = await sbService.from("audit_sections").insert({
          template_id: tmplData.id,
          name: sec.name,
          display_order: si + 1,
        }).select("id").single();

        if (secError) {
          sectionErrors.push(`Section "${sec.name}": ${secError.message}`);
          continue;
        }

        for (let fi = 0; fi < (sec.fields || []).length; fi++) {
          const fld = sec.fields[fi];
          await sbService.from("audit_fields").insert({
            section_id: secData.id,
            name: fld.name,
            field_type: fld.field_type || "yes_no",
            is_required: fld.is_required ?? true,
            display_order: fi + 1,
          });
        }
      }

      if (args.pending_action_id) {
        await sbService.from("dash_pending_actions")
          .update({
            status: "executed",
            approved_at: new Date().toISOString(),
            approved_by: userId,
            execution_result: { template_id: tmplData.id, template_name: tmplData.name, section_errors: sectionErrors },
            updated_at: new Date().toISOString(),
          })
          .eq("id", args.pending_action_id);
      }

      await sbService.from("dash_action_log").insert({
        company_id: companyId,
        user_id: userId,
        action_type: "write",
        action_name: "create_audit_template",
        risk_level: "medium",
        request_json: args,
        result_json: { template_id: tmplData.id },
        status: "success",
        approval_status: "approved",
        entities_affected: [tmplData.id],
        modules_touched: ["location_audits"],
      });

      const resultStatus = sectionErrors.length > 0 ? "partial" : "success";
      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: resultStatus,
        title: resultStatus === "success" ? "Audit Template Created" : "Template Created with Warnings",
        summary: `Template "${tmplData.name}" created successfully. ${sectionErrors.length > 0 ? `${sectionErrors.length} section errors.` : "All sections and fields added. You can find it in Audit Templates."}`,
        changes: [`Template "${tmplData.name}" created`, `${(templateSections || []).length} sections added`],
        errors: sectionErrors.length > 0 ? sectionErrors : undefined,
      }));

      return {
        type: "audit_template_created",
        template_id: tmplData.id,
        template_name: tmplData.name,
        section_errors: sectionErrors,
        message: `Audit template "${tmplData.name}" created successfully! ${sectionErrors.length > 0 ? `${sectionErrors.length} issues with sections.` : "You can find it in Audit Templates."}`,
      };
    }

    case "reassign_corrective_action": {
      // P0-1 FIX: Draft-only — NO immediate execution
      // Validate CA exists and belongs to company
      const { data: caData, error: caError } = await sb.from("corrective_actions")
        .select("id, title, assigned_to, location_id, locations(name), company_id")
        .eq("id", args.corrective_action_id)
        .maybeSingle();

      if (caError || !caData) return { error: "Corrective action not found." };
      if (caData.company_id !== companyId) return { error: "Cross-tenant action rejected." };

      // Resolve new assignee name
      let newAssigneeName = args.new_assigned_name || "Unknown";
      if (!args.new_assigned_name && args.new_assigned_to) {
        const { data: empLookup } = await sb.from("employees")
          .select("full_name")
          .eq("id", args.new_assigned_to)
          .maybeSingle();
        if (empLookup) newAssigneeName = empLookup.full_name;
      }

      // Create pending action — user must approve before execution
      const { data: paData } = await sbService.from("dash_pending_actions").insert({
        company_id: companyId,
        user_id: userId,
        action_name: "reassign_corrective_action",
        action_type: "write",
        risk_level: "high",
        preview_json: {
          ca_id: caData.id,
          ca_title: caData.title,
          old_assigned_to: caData.assigned_to,
          new_assigned_to: args.new_assigned_to,
          new_assigned_name: newAssigneeName,
          reason: args.reason,
        },
        status: "pending",
      }).select("id").single();

      // Push action_preview card — user sees this and must click Approve
      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: `Reassign CA: "${caData.title}"`,
        summary: `Change assignee to ${newAssigneeName}. Reason: ${args.reason || "Not specified"}.`,
        risk: "high",
        affected: [caData.title, newAssigneeName].filter(Boolean),
        pending_action_id: paData?.id,
        can_approve: true,
        draft: {
          ca_id: caData.id,
          ca_title: caData.title,
          new_assigned_to: args.new_assigned_to,
          new_assigned_name: newAssigneeName,
          reason: args.reason,
        },
      }));

      return {
        type: "action_preview",
        pending_action_id: paData?.id,
        message: `CA reassignment draft created. Please review and approve to proceed.`,
      };
    }

    case "execute_ca_reassignment": {
      // P0-1: Execute only after user approval
      if (!args.pending_action_id) return { error: "Missing pending_action_id." };

      const { data: pa } = await sbService.from("dash_pending_actions")
        .select("id, status, company_id, preview_json")
        .eq("id", args.pending_action_id)
        .maybeSingle();

      if (!pa) return { error: "Pending action not found." };
      if (pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
      if (pa.status !== "pending") return { error: `Action already ${pa.status}.` };

      const preview = pa.preview_json as any;

      const { error: updateError } = await sbService.from("corrective_actions")
        .update({ assigned_to: preview.new_assigned_to, updated_at: new Date().toISOString() })
        .eq("id", preview.ca_id)
        .eq("company_id", companyId);

      if (updateError) {
        await sbService.from("dash_pending_actions")
          .update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() })
          .eq("id", pa.id);

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "error",
          title: "Reassignment Failed",
          summary: updateError.message,
          errors: [updateError.message],
        }));
        return { error: `Reassignment failed: ${updateError.message}` };
      }

      await sbService.from("dash_pending_actions")
        .update({
          status: "executed",
          approved_at: new Date().toISOString(),
          approved_by: userId,
          execution_result: { success: true },
          updated_at: new Date().toISOString(),
        })
        .eq("id", pa.id);

      await sbService.from("dash_action_log").insert({
        company_id: companyId,
        user_id: userId,
        action_type: "write",
        action_name: "reassign_corrective_action",
        risk_level: "high",
        request_json: preview,
        result_json: { ca_id: preview.ca_id, new_assigned_to: preview.new_assigned_to },
        status: "success",
        approval_status: "approved",
        entities_affected: [preview.ca_id],
        modules_touched: ["corrective_actions"],
      });

      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: "success",
        title: "Corrective Action Reassigned",
        summary: `"${preview.ca_title}" reassigned to ${preview.new_assigned_name || preview.new_assigned_to}.`,
        changes: [`CA "${preview.ca_title}" reassigned`, `New assignee: ${preview.new_assigned_name || preview.new_assigned_to}`],
      }));

      return {
        type: "ca_reassigned",
        ca_id: preview.ca_id,
        ca_title: preview.ca_title,
        new_assigned_to: preview.new_assigned_to,
        message: `Corrective action "${preview.ca_title}" reassigned successfully.`,
      };
    }

    case "execute_shift_creation": {
      // P0-2: Execute shift creation after user approval
      if (!args.pending_action_id) return { error: "Missing pending_action_id." };

      const { data: pa } = await sbService.from("dash_pending_actions")
        .select("id, status, company_id, preview_json")
        .eq("id", args.pending_action_id)
        .maybeSingle();

      if (!pa) return { error: "Pending action not found." };
      if (pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
      if (pa.status !== "pending") return { error: `Action already ${pa.status}.` };

      const draft = pa.preview_json as any;

      const { data: shiftData, error: shiftError } = await sbService.from("shifts").insert({
        company_id: companyId,
        location_id: draft.location_id,
        role: draft.role,
        shift_date: draft.shift_date,
        start_time: draft.start_time,
        end_time: draft.end_time,
        required_count: draft.min_staff || 1,
        shift_type: draft.shift_type || "regular",
        notes: draft.notes || null,
        created_by: userId,
        is_published: true,
        status: "published",
      }).select("id, shift_date, start_time, end_time").single();

      if (shiftError) {
        await sbService.from("dash_pending_actions")
          .update({ status: "failed", execution_result: { error: shiftError.message }, updated_at: new Date().toISOString() })
          .eq("id", pa.id);

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "error",
          title: "Shift Creation Failed",
          summary: shiftError.message,
          errors: [shiftError.message],
        }));
        return { error: `Failed to create shift: ${shiftError.message}` };
      }

      // Create shift_assignment if employee was specified in the draft
      let assignmentCreated = false;
      let assignedEmployeeName = draft.employee_name || null;
      if (draft.employee_id) {
        const { error: assignError } = await sbService.from("shift_assignments").insert({
          shift_id: shiftData.id,
          staff_id: draft.employee_id,
          assigned_by: userId,
          status: "assigned",
          approval_status: "approved",
          approved_at: new Date().toISOString(),
        });
        if (assignError) {
          console.error("Failed to create shift assignment:", assignError.message);
        } else {
          assignmentCreated = true;
        }
      }

      await sbService.from("dash_pending_actions")
        .update({
          status: "executed",
          approved_at: new Date().toISOString(),
          approved_by: userId,
          execution_result: { shift_id: shiftData.id, assignment_created: assignmentCreated },
          updated_at: new Date().toISOString(),
        })
        .eq("id", pa.id);

      await sbService.from("dash_action_log").insert({
        company_id: companyId,
        user_id: userId,
        action_type: "write",
        action_name: "create_shift",
        risk_level: "medium",
        request_json: draft,
        result_json: { shift_id: shiftData.id, assignment_created: assignmentCreated, employee_id: draft.employee_id },
        status: "success",
        approval_status: "approved",
        entities_affected: [shiftData.id],
        modules_touched: ["workforce"],
      });

      const assignmentMsg = assignmentCreated && assignedEmployeeName
        ? ` and assigned to ${assignedEmployeeName}`
        : assignmentCreated ? " and assigned to employee" : "";

      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: "success",
        title: "Shift Created",
        summary: `Shift on ${shiftData.shift_date} (${shiftData.start_time}–${shiftData.end_time}) created${assignmentMsg}.`,
        changes: [
          `Shift created for ${draft.shift_date}`,
          `Time: ${draft.start_time}–${draft.end_time}`,
          ...(assignmentCreated ? [`Assigned to ${assignedEmployeeName || draft.employee_id}`] : []),
        ],
      }));

      return {
        type: "shift_created",
        shift_id: shiftData.id,
        assignment_created: assignmentCreated,
        message: `Shift created successfully for ${shiftData.shift_date}${assignmentMsg}.`,
      };
    }

    // ────────── MEMORY TOOLS ──────────
    case "save_user_preference": {
      const { error } = await sbService.from("dash_user_preferences").upsert({
        company_id: companyId,
        user_id: userId,
        preference_key: args.preference_key,
        preference_value: args.preference_value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,user_id,preference_key" });
      if (error) return { error: error.message };
      return { saved: true, key: args.preference_key, message: `Preference "${args.preference_key}" saved.` };
    }

    case "get_user_preferences": {
      const { data, error } = await sb.from("dash_user_preferences")
        .select("preference_key, preference_value, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) return { error: error.message };
      const prefs: Record<string, any> = {};
      for (const p of data ?? []) prefs[p.preference_key] = p.preference_value;
      return { preferences: prefs, count: (data ?? []).length };
    }

    case "save_org_memory": {
      const { error } = await sbService.from("dash_org_memory").upsert({
        company_id: companyId,
        memory_type: args.memory_type,
        memory_key: args.memory_key,
        content_json: args.content,
        created_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,memory_type,memory_key" });
      if (error) return { error: error.message };
      return { saved: true, type: args.memory_type, key: args.memory_key, message: `Organization memory "${args.memory_key}" saved.` };
    }

    case "get_org_memory": {
      let q = sb.from("dash_org_memory")
        .select("memory_type, memory_key, content_json, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (args.memory_type) q = q.eq("memory_type", args.memory_type);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { memories: data ?? [], count: (data ?? []).length };
    }

    // ────────── WORKFLOW TOOLS ──────────
    case "save_workflow": {
      const { data, error } = await sbService.from("dash_saved_workflows").insert({
        company_id: companyId,
        user_id: userId,
        name: args.name,
        description: args.description || null,
        workflow_json: { prompt: args.prompt },
        is_shared: args.is_shared || false,
      }).select("id, name").single();
      if (error) return { error: error.message };
      return { saved: true, workflow_id: data.id, name: data.name, message: `Workflow "${data.name}" saved. It will appear as a shortcut in your Dash sidebar.` };
    }

    case "list_saved_workflows": {
      const { data, error } = await sb.from("dash_saved_workflows")
        .select("id, name, description, workflow_json, is_shared, created_at")
        .or(`user_id.eq.${userId},is_shared.eq.true`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return { error: error.message };
      return { workflows: data ?? [], count: (data ?? []).length };
    }

    // ────────── FILE TRANSFORMATION TOOLS ──────────
    case "transform_spreadsheet_to_schedule": {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `Analyze this spreadsheet and extract schedule/shift data. Return a JSON object with: { shifts: [{ role: string, date: "YYYY-MM-DD", start_time: "HH:MM", end_time: "HH:MM", location_name?: string, employee_name?: string, min_staff?: number }], warnings: string[] }. Only return valid JSON, no markdown fences.` },
                { type: "image_url", image_url: { url: args.file_url } },
              ],
            }],
            stream: false,
          }),
        });
        if (!resp.ok) return { error: "Failed to parse spreadsheet." };
        const result = await resp.json();
        const content = result.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { type: "schedule_extraction", file_name: args.file_name, ...parsed, next_step: "Review shifts and create each using create_shift_draft." };
          }
        } catch {}
        return { raw_extraction: content, error: "Could not parse structured schedule data." };
      } catch (err: any) {
        return { error: `Schedule extraction failed: ${err.message}` };
      }
    }

    case "transform_sop_to_training": {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
      try {
        let fileContent: { base64: string; mimeType: string };
        try {
          fileContent = await downloadFileAsBase64(sbService, args.file_url);
        } catch (dlErr: any) {
          console.error("File download failed:", dlErr);
          return { error: "Could not access the uploaded file. Please try re-uploading." };
        }

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `Analyze this SOP/procedure document and extract it as a training module. Return a JSON object with: { module_name: string, description: string, sections: [{ title: string, key_points: string[], duration_minutes: number }], quiz_questions: [{ question: string, options: string[], correct_answer_index: number }], estimated_total_duration_minutes: number }. Only return valid JSON, no markdown fences.` },
                { type: "image_url", image_url: { url: `data:${fileContent.mimeType};base64,${fileContent.base64}` } },
              ],
            }],
            stream: false,
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("AI parse error:", resp.status, errText);
          return { error: "Failed to parse SOP document." };
        }
        const result = await resp.json();
        const content = result.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (args.module_name) parsed.module_name = args.module_name;
            return { type: "training_module_extraction", file_name: args.file_name, ...parsed, next_step: "Review the training module structure. This is a draft — the training module creation tool will be available in a future update." };
          }
        } catch {}
        return { raw_extraction: content, error: "Could not parse training module structure." };
      } catch (err: any) {
        return { error: `SOP extraction failed: ${err.message}` };
      }
    }

    // transform_compliance_doc_to_audit is now handled by parse_uploaded_file with intent="compliance_audit"
    case "transform_compliance_doc_to_audit": {
      // Redirect to parse_uploaded_file logic
      return await executeToolInner(sb, sbService, "parse_uploaded_file", { ...args, intent: "compliance_audit" }, companyId, userId, role, activeModules, structuredEvents);
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── System Prompt Builder ──────────────────────────────────
function buildSystemPrompt(ctx: { role: string; companyName: string; modules: string[]; locations: string[]; today: string; todayLabel: string }): string {
  return `You are **Dash**, the operational command center of Dashspect — a multi-tenant platform for compliance, workforce, and operations management.

## Your Identity
- You are NOT a generic chatbot. You are a governed, permission-aware operational assistant.
- You speak with authority, clarity, and precision.
- You always cite data sources and time ranges.
- You never hallucinate or guess. If data is unavailable, say so clearly.

## Current Context
- **Company**: ${ctx.companyName}
- **User Role**: ${ctx.role}
- **Active Modules**: ${ctx.modules.length > 0 ? ctx.modules.join(", ") : "None detected"}
- **Locations**: ${ctx.locations.length > 0 ? ctx.locations.join(", ") : "Not loaded"}
- **Today**: ${ctx.today} (${ctx.todayLabel})
- **Timezone**: Europe/Bucharest

## Your Capabilities

### Read & Analyze (all modules)
- **Locations**: Search, overview, cross-module summaries
- **Audits**: Results, scores, comparisons between locations
- **Workforce**: Employee search, attendance exceptions
- **Corrective Actions**: Open/overdue items by severity
- **Tasks**: Completion summaries
- **CMMS**: Work order status
- **Documents**: Expiring documents
- **Training**: Gaps and overdue assignments

### File Processing
- **ID Scan**: Extract employee data from uploaded ID card photos → create employee draft
- **Audit Template from PDF**: Parse PDF/image documents → create structured audit template draft. Use \`parse_uploaded_file\` with intent \`audit_template\`.
- **Compliance Audit from PDF**: Parse compliance/regulation documents → create recurring audit template. Use \`parse_uploaded_file\` with intent \`compliance_audit\`.
- **CRITICAL FILE RULE**: When the user message contains \`[File URLs:\`, you MUST call \`parse_uploaded_file\` with the file URL. NEVER respond with text saying you cannot parse or process a file. ALWAYS use the tool.
- **NAME OVERRIDE RULE**: When the user specifies a custom name for the audit template (e.g. "name it X", "call it Y", "with the name Z"), you MUST pass it as \`requested_template_name\` to \`parse_uploaded_file\`. This overrides the AI-extracted title.

### Draft & Execute (APPROVAL-GATED WRITES)
You can now create AND execute records in the platform:

**CRITICAL — STOP AFTER DRAFT**: After calling ANY draft tool (create_employee_draft, create_audit_template_draft, create_shift_draft, reassign_corrective_action), you MUST immediately STOP making tool calls and present the draft preview to the user. Do NOT call any execute tool (execute_employee_creation, execute_audit_template_creation, execute_shift_creation, execute_ca_reassignment) in the same response. The approval card UI will handle the approval flow. You must wait for the NEXT user message containing explicit approval before executing.

**Employee Creation Flow:**
1. Use \`create_employee_draft\` to prepare the draft and show preview
2. STOP — do not call any more tools. Present the draft to the user.
3. Wait for the user to say "approve", "confirm", "yes", "go ahead", or similar in a NEW message
4. ONLY THEN call \`execute_employee_creation\` with the pending_action_id and draft data

**Audit Template Creation Flow:**
1. Use \`create_audit_template_draft\` to prepare the draft
2. STOP — do not call any more tools. Present the draft to the user.
3. Wait for user approval in a NEW message
4. Call \`execute_audit_template_creation\` with the pending_action_id

**Corrective Action Reassignment:**
1. Use \`reassign_corrective_action\` to create a draft showing impact
2. STOP — do not call any more tools. Present the draft to the user.
3. Wait for user approval — this is a HIGH RISK action, clearly explain what will change
4. ONLY THEN call \`execute_ca_reassignment\` with the pending_action_id

**Shift Creation Flow:**
1. Use \`create_shift_draft\` to prepare and show preview. When the user mentions a specific person/employee, ALWAYS include \`employee_name\` so the shift gets assigned to them.
2. STOP — do not call any more tools. Present the draft to the user.
3. Wait for user approval in a NEW message
4. ONLY THEN call \`execute_shift_creation\` with the pending_action_id

### Approval Rules
- MEDIUM risk: User must confirm with clear affirmative response
- HIGH risk: Show detailed impact summary, list affected entities, then confirm
- NEVER skip the approval step for write operations
- NEVER call a draft tool and its corresponding execute tool in the same turn — this is FORBIDDEN
- If the user says "approve" or "confirm" or "yes" in response to a draft, execute the corresponding action using the pending_action_id

### Memory & Personalization
- **User Preferences**: Save/recall user preferences (report format, default date ranges, favorite locations) using \`save_user_preference\` and \`get_user_preferences\`. Check preferences at the start of complex queries to personalize output.
- **Organization Memory**: Save/recall company-specific terminology and processes using \`save_org_memory\` and \`get_org_memory\`. When the user says "we call X as Y" or "our standard is...", save it.
- **Saved Workflows**: Save reusable prompt shortcuts using \`save_workflow\`. When user says "save this as a shortcut" or "remember this report", save the prompt.

### File Transformations (Extended)
- **Spreadsheet → Schedule**: Use \`transform_spreadsheet_to_schedule\` to parse CSV/Excel into shift drafts
- **SOP → Training Module**: Use \`transform_sop_to_training\` to convert procedure documents into training content
- **Compliance Doc → Audit Template**: Use \`parse_uploaded_file\` with intent \`compliance_audit\` (do NOT use \`transform_compliance_doc_to_audit\` — it is deprecated)

## Response Guidelines
1. Use **markdown** formatting for readability.
2. Always state the **date range** and **scope** of your analysis.
3. When comparing, use tables for clarity.
4. Provide **actionable recommendations** when appropriate.
5. If a module is not active, inform the user.
6. Keep responses concise but thorough.
7. When a user attaches a file, detect the intent and use the appropriate tool.
8. For write actions, always show a clear summary before and after execution.
9. After executing a write, report the result clearly (success/failure/partial).
10. At the start of conversations, silently check user preferences and org memory to personalize responses.
11. If a tool returns an error with "recoverable: true", explain the failure clearly to the user and suggest they retry. Do NOT silently swallow tool errors.

## What You Cannot Do
- Access other companies' data
- Skip approval for write operations
- Execute bulk destructive operations
- Modify permissions or roles`;
}

// ─── Main Handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { messages, session_id, direct_approval } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Resolve company + role
    const { data: cuData, error: cuError } = await sb.from("company_users")
      .select("company_id, company_role")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cuError || !cuData) {
      return new Response(JSON.stringify({ error: "User not in any company" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const companyId = cuData.company_id;
    const companyRole = cuData.company_role;

    // Resolve platform role
    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", userId);
    const platformRoles = (roleRows ?? []).map((r: any) => r.role);
    const displayRole = platformRoles.includes("admin") ? "admin" : platformRoles.includes("manager") ? "manager" : companyRole;

    // ─── DIRECT APPROVAL PATH (bypasses LLM) ───
    if (direct_approval?.pending_action_id && direct_approval?.action === "approve") {
      // Load active modules (required for gating check)
      const { data: modulesData } = await sb
        .from("company_modules")
        .select("module_name")
        .eq("company_id", companyId)
        .eq("is_active", true);
      const activeModules = (modulesData ?? []).map((m: any) => m.module_name);

      // Server-authoritative: resolve execute tool + hydrate args from pending action
      let toolName = direct_approval.execute_tool || "execute_shift_creation";
      let hydratedArgs: Record<string, any> = { pending_action_id: direct_approval.pending_action_id };
      try {
        const { data: pendingAction } = await sbService
          .from("dash_pending_actions")
          .select("action_name, preview_json")
          .eq("id", direct_approval.pending_action_id)
          .eq("company_id", companyId)
          .maybeSingle();
        if (pendingAction?.action_name && ACTION_EXECUTE_MAP[pendingAction.action_name]) {
          toolName = ACTION_EXECUTE_MAP[pendingAction.action_name];
        }
        // Hydrate execution args from draft preview_json
        if (pendingAction?.action_name && pendingAction?.preview_json) {
          const draftArgs = hydrateArgsFromDraft(pendingAction.action_name, pendingAction.preview_json);
          hydratedArgs = { ...hydratedArgs, ...draftArgs };
        }
      } catch (e) { console.error("[Dash] Failed to resolve pending action for direct approval:", e); }

      const allStructuredEvents: string[] = [];
      const toolResult = await executeTool(sb, sbService, toolName, hydratedArgs, companyId, userId, displayRole, activeModules, allStructuredEvents);
      
      // Log action with canonical module
      const canonicalModule = resolveCanonicalModule(toolName);
      try {
        await sbService.from("dash_action_log").insert({
          company_id: companyId, user_id: userId, session_id: session_id || null,
          action_type: "write", action_name: toolName, risk_level: "medium",
          request_json: { pending_action_id: direct_approval.pending_action_id, direct_approval: true },
          result_json: toolResult, status: toolResult.error ? "error" : "success",
          approval_status: "approved", modules_touched: [canonicalModule],
        });
      } catch (e) { console.error("[Dash] Failed to log direct approval action:", e); }

      // Save session with approval result
      if (session_id && messages) {
        const resultText = toolResult.error
          ? `⚠️ ${toolResult.error}`
          : `✅ ${toolResult.message || "Action executed successfully."}`;
        // Include structured events so execution result cards survive session reload
        const structuredForSave = allStructuredEvents.map((evtStr: string) => {
          try { const parsed = JSON.parse(evtStr); return { event_type: parsed.event_type, data: parsed.data }; } catch { return null; }
        }).filter(Boolean);
        try {
          await sbService.from("dash_sessions").upsert({
            id: session_id, company_id: companyId, user_id: userId,
            title: generateSmartTitle(messages?.[0]?.content),
            messages_json: [...messages, { role: "assistant", content: resultText, structured: structuredForSave }],
            status: "active", updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        } catch (e) { console.error("[Dash] Failed to save session after approval:", e); }
      }

      // Stream result as SSE
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const evt of allStructuredEvents) {
            controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
          }
          const resultText = toolResult.error
            ? `⚠️ ${toolResult.error}`
            : `✅ ${toolResult.message || "Action executed successfully."}`;
          const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: resultText }, finish_reason: null }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // ─── DIRECT REJECTION PATH ───
    if (direct_approval?.pending_action_id && direct_approval?.action === "reject") {
      await sbService.from("dash_pending_actions")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", direct_approval.pending_action_id)
        .eq("company_id", companyId);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const evt = makeStructuredEvent("execution_result", { status: "info", title: "Action Rejected", summary: "The action has been rejected and will not be executed." });
          controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
          const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: "Action rejected." }, finish_reason: null }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // Get company name
    const { data: companyData } = await sb.from("companies").select("name").eq("id", companyId).single();
    const companyName = companyData?.name ?? "Unknown";

    // Get active modules
    const { data: modulesData } = await sb.from("company_modules").select("module_name").eq("company_id", companyId).eq("is_active", true);
    const activeModules = (modulesData ?? []).map((m: any) => m.module_name);

    // Get locations
    const { data: locationsData } = await sb.from("locations").select("name").eq("company_id", companyId).limit(20);
    const locationNames = (locationsData ?? []).map((l: any) => l.name);

    console.log(`[Dash] User=${userId} Company=${companyId} Role=${displayRole} Modules=${activeModules.length}`);

    // ─── Rate Limiting: 30 messages/hour ───
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCount } = await sbService
      .from("dash_action_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= 30) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. You can send up to 30 messages per hour. Please wait a few minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── Input Sanitization ───
    const sanitizedMessages = messages.map((m: any) => ({
      ...m,
      content: typeof m.content === "string" ? sanitizeInput(m.content) : m.content,
    }));

    // Use Europe/Bucharest timezone for "today" resolution
    const nowBucharest = new Date().toLocaleString('en-CA', { timeZone: DEFAULT_TIMEZONE }).split(',')[0];
    const today = nowBucharest; // YYYY-MM-DD in local tz
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: DEFAULT_TIMEZONE });
    const systemPrompt = buildSystemPrompt({ role: displayRole, companyName, modules: activeModules, locations: locationNames, today, todayLabel });
    let conversationMessages = [{ role: "system", content: systemPrompt }, ...sanitizedMessages];

    const maxIterations = 8;
    let iteration = 0;
    const toolsUsed: string[] = [];
    const allStructuredEvents: string[] = [];

    while (iteration < maxIterations) {
      iteration++;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          tool_choice: "auto",
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits depleted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const txt = await response.text();
        console.error("AI gateway error:", status, txt);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await response.json();
      const choice = result.choices?.[0];
      if (!choice) throw new Error("No response from AI");

      const msg = choice.message;

      // Tool calls
      if (msg.tool_calls?.length) {
        conversationMessages.push(msg);
        let draftCalled = false;
        for (const tc of msg.tool_calls) {
          const toolName = tc.function.name;
          // Guard: if a draft tool was already called in this batch, skip execute tools
          if (draftCalled && (toolName.startsWith("execute_") || toolName === "execute_ca_reassignment")) {
            console.warn(`[Dash] Blocked same-turn execute after draft: ${toolName}`);
            conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ skipped: true, reason: "Waiting for user approval before executing." }) });
            continue;
          }
          let args: any;
          try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
          toolsUsed.push(toolName);
          const toolResult = await executeTool(sb, sbService, toolName, args, companyId, userId, displayRole, activeModules, allStructuredEvents);
          conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
          // Mark if a draft tool was called — block further execute tools in this batch
          if (toolName.endsWith("_draft") || toolName === "reassign_corrective_action") {
            draftCalled = true;
          }
        }
        // If a draft was called, force the LLM to stop and present the draft
        if (draftCalled) {
          conversationMessages.push({ role: "system", content: "A draft was created. STOP calling tools now. Present the draft preview to the user and wait for their approval in the next message." });
        }
        continue;
      }

      // Final text response — stream it with structured events
      let finalContent = msg.content || "";

      // ─── Guard: never send empty bubbles ───
      if (!finalContent.trim() && allStructuredEvents.length === 0) {
        finalContent = "I'm ready to help — could you clarify what you'd like me to do next?";
      }

      // ─── FALLBACK: Model refused to call tool when file was attached ───
      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      const hasFileAttachment = typeof lastUserMsg === "string" && lastUserMsg.includes("[File URLs:");
      const looksLikeRefusal = /unable to parse|cannot (create|parse|process|read|extract)|can't (create|parse|process|read)|don't have the ability|not able to/i.test(finalContent);
      if (hasFileAttachment && looksLikeRefusal && toolsUsed.length === 0) {
        console.log("[Dash] FALLBACK: Model refused file processing, forcing parse_uploaded_file");
        // Extract file URL and name from the user message
        const urlMatch = lastUserMsg.match(/\[File URLs?:\s*(https?:\/\/[^\s\],]+)/);
        const nameMatch = lastUserMsg.match(/\[Attached files?:\s*([^\]]+)\]/);
        if (urlMatch) {
          const fileUrl = urlMatch[1];
          const fileName = nameMatch?.[1]?.split(",")[0]?.trim() || "uploaded_file";
          const intent = /compliance|regulation/i.test(lastUserMsg) ? "compliance_audit" : "audit_template";
          const fallbackResult = await executeTool(sb, sbService, "parse_uploaded_file", { file_url: fileUrl, file_name: fileName, intent }, companyId, userId, displayRole, activeModules, allStructuredEvents);
          if (!fallbackResult.error) {
            conversationMessages.push(msg);
            conversationMessages.push({ role: "user", content: `[System: The file was successfully parsed. Here is the extracted data: ${JSON.stringify(fallbackResult).substring(0, 3000)}. Present this to the user as a structured audit template preview.]` });
            continue;
          } else {
            // Normalize error: hide internal tool names
            const cleanError = (fallbackResult.error as string)
              .replace(/parse_uploaded_file|transform_compliance_doc_to_audit|executeTool|downloadFileAsBase64/gi, "document processor")
              .replace(/Gemini|LLM|model/gi, "AI");
            finalContent = `⚠️ Could not process the uploaded document. ${cleanError}. Please try re-uploading or using a different file format.`;
          }
        }
      }

      // Log action
      try {
        const actionType = toolsUsed.some(t => t.startsWith("execute_") || t === "reassign_corrective_action") ? "write" : "read";
        await sbService.from("dash_action_log").insert({
          company_id: companyId,
          user_id: userId,
          session_id: session_id || null,
          action_type: actionType,
          action_name: actionType === "write" ? toolsUsed.find(t => t.startsWith("execute_") || t === "reassign_corrective_action") || "chat_response" : "chat_response",
          risk_level: actionType === "write" ? "medium" : "low",
          request_json: { question: messages?.[messages.length - 1]?.content?.substring(0, 500) },
          result_json: { answer_preview: finalContent.substring(0, 500), tools_used: toolsUsed },
          status: "success",
          approval_status: actionType === "write" ? "approved" : "not_required",
          modules_touched: [...new Set(toolsUsed.map(t => resolveCanonicalModule(t)))],
        });
      } catch (logErr) {
        console.error("Failed to log Dash action:", logErr);
      }

      // Save/update session (include structured events for persistence)
      if (session_id) {
        try {
          // Parse structured events into JSON for persistence
          const parsedStructuredEvents = allStructuredEvents.map((evt: string) => {
            try { return JSON.parse(evt); } catch { return null; }
          }).filter(Boolean);

          const assistantMsg: any = { role: "assistant", content: finalContent };
          if (parsedStructuredEvents.length > 0) {
            assistantMsg.structured = parsedStructuredEvents;
          }

          await sbService.from("dash_sessions").upsert({
            id: session_id,
            company_id: companyId,
            user_id: userId,
            title: generateSmartTitle(messages?.[0]?.content),
            messages_json: [...messages, assistantMsg],
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        } catch (sessErr) {
          console.error("Failed to save session:", sessErr);
        }
      }

      // Stream response as SSE with structured events
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // First emit structured events
          for (const evt of allStructuredEvents) {
            controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
          }

          // Then stream text
          const chunkSize = 30;
          let pos = 0;
          const sendChunks = () => {
            if (pos < finalContent.length) {
              const chunk = finalContent.slice(pos, pos + chunkSize);
              pos += chunkSize;
              const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
              setTimeout(sendChunks, 8);
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          };
          sendChunks();
        },
      });

      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // Return max-iterations as SSE stream so frontend can parse it consistently
    const encoder = new TextEncoder();
    const errStream = new ReadableStream({
      start(controller) {
        const errEvt = JSON.stringify({ type: "structured_event", event_type: "execution_result", data: { status: "error", title: "Processing Limit Reached", summary: "The request required too many steps to complete. Please try a simpler request or break it into smaller parts." } });
        controller.enqueue(encoder.encode(`data: ${errEvt}\n\n`));
        const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: "⚠️ Request exceeded processing limits. Please try again with a simpler request." }, finish_reason: null }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(errStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("Dash command error:", error);
    // Return error as SSE stream so frontend can parse it consistently (not raw JSON)
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    const encoder = new TextEncoder();
    const errStream = new ReadableStream({
      start(controller) {
        const errEvt = JSON.stringify({ type: "structured_event", event_type: "execution_result", data: { status: "error", title: "Request Failed", summary: errMsg } });
        controller.enqueue(encoder.encode(`data: ${errEvt}\n\n`));
        const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: `⚠️ ${errMsg}` }, finish_reason: null }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(errStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }
});
