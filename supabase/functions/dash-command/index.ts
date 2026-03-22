import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_TIMEZONE = "Europe/Bucharest";
const MAX_TOOL_ROWS = 200;

// ─── Module Gating Map ─────────────────────────────────────
const TOOL_MODULE_MAP: Record<string, string> = {
  get_audit_results: "audits",
  compare_location_performance: "audits",
  get_open_corrective_actions: "corrective_actions",
  get_task_completion_summary: "tasks",
  get_attendance_exceptions: "workforce",
  get_work_order_status: "cmms",
  get_document_expiries: "documents",
  get_training_gaps: "workforce",
  search_employees: "workforce",
  execute_employee_creation: "workforce",
  execute_audit_template_creation: "audits",
  reassign_corrective_action: "corrective_actions",
  create_shift_draft: "workforce",
  execute_shift_creation: "workforce",
  transform_spreadsheet_to_schedule: "workforce",
  transform_sop_to_training: "workforce",
  transform_compliance_doc_to_audit: "audits",
};

// ─── Risk classification ────────────────────────────────────
const ACTION_RISK: Record<string, "low" | "medium" | "high"> = {
  create_employee_draft: "medium",
  create_audit_template_draft: "medium",
  create_shift_draft: "medium",
  execute_employee_creation: "medium",
  execute_audit_template_creation: "medium",
  execute_shift_creation: "medium",
  reassign_corrective_action: "high",
};

// ─── Helpers ────────────────────────────────────────────────
function cap<T>(data: T[] | null, limit = MAX_TOOL_ROWS) {
  const items = data ?? [];
  const total = items.length;
  return { items: items.slice(0, limit), total, returned: Math.min(total, limit), truncated: total > limit };
}

async function utcRange(sb: any, from: string, to: string, tz = DEFAULT_TIMEZONE) {
  const { data, error } = await sb.rpc("tz_date_range_to_utc", { from_date: from, to_date: to, tz });
  if (error || !data?.[0]) return null;
  return { fromUtc: data[0].from_utc, toUtc: data[0].to_utc };
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
      description: "Compare audit performance across locations for a date range.",
      parameters: {
        type: "object",
        properties: {
          location_ids: { type: "array", items: { type: "string" }, description: "Location UUIDs to compare" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["location_ids", "from", "to"],
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
      description: "Parse an uploaded file (PDF, image, spreadsheet) to extract structured content. Use when the user has attached a file and wants to process it.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "The signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
          intent: { type: "string", enum: ["id_scan", "audit_template", "schedule_import", "document_parse", "general"], description: "What the user wants to do with the file" },
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
        },
        required: ["role", "shift_date", "start_time", "end_time"],
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
  // --- FILE: Compliance doc to recurring audit ---
  {
    type: "function",
    function: {
      name: "transform_compliance_doc_to_audit",
      description: "Parse an uploaded compliance/regulation document and suggest a recurring audit template that covers its requirements.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "Signed URL of the uploaded file" },
          file_name: { type: "string", description: "Original filename" },
          regulation_name: { type: "string", description: "Name of the regulation/standard" },
        },
        required: ["file_url", "file_name"],
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
    return { error: `The "${requiredModule}" module is not active for your company. Please enable it in Billing & Modules.` };
  }

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
        sb.from("location_audits").select("overall_score").eq("location_id", locationId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1),
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

      let auditQ = sb.from("location_audits").select("id, overall_score, status, location_id, locations(name)").gte("created_at", ur?.fromUtc ?? args.from).lt("created_at", ur?.toUtc ?? args.to);
      if (locationFilter) auditQ = auditQ.eq("location_id", locationFilter);
      const { data: audits } = await auditQ.limit(200);

      const completedAudits = (audits ?? []).filter((a: any) => a.status === "completed");
      const avgScore = completedAudits.length > 0 ? Math.round(completedAudits.reduce((s: number, a: any) => s + (a.overall_score ?? 0), 0) / completedAudits.length) : null;

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
        audits: { total: (audits ?? []).length, completed: completedAudits.length, avg_score: avgScore },
        corrective_actions: { open: (cas ?? []).filter((c: any) => c.status === "open").length, in_progress: (cas ?? []).filter((c: any) => c.status === "in_progress").length, by_severity: { critical: (cas ?? []).filter((c: any) => c.severity === "critical").length, high: (cas ?? []).filter((c: any) => c.severity === "high").length } },
        attendance: { total_logs: (attLogs ?? []).length, late_arrivals: lateCount, missing_checkouts: noCheckout },
        work_orders: { open: (wos ?? []).filter((w: any) => w.status === "open").length, in_progress: (wos ?? []).filter((w: any) => w.status === "in_progress").length },
      };
    }

    case "get_audit_results": {
      const limit = Math.min(args.limit || 20, MAX_TOOL_ROWS);
      let q = sb.from("location_audits").select("id, overall_score, status, created_at, completed_at, location_id, locations(name), template_id, audit_templates(name)")
        .eq("status", "completed").gte("created_at", args.from).lte("created_at", args.to + "T23:59:59Z").order("completed_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.template_id) q = q.eq("template_id", args.template_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, audits: c.items.map((a: any) => ({ id: a.id, score: a.overall_score, location: a.locations?.name, template: a.audit_templates?.name, completed_at: a.completed_at })) };
    }

    case "compare_location_performance": {
      const results: any[] = [];
      for (const locId of args.location_ids ?? []) {
        const { data } = await sb.from("location_audits").select("overall_score, locations(name)").eq("location_id", locId).eq("status", "completed").gte("created_at", args.from).lte("created_at", args.to + "T23:59:59Z");
        const scores = (data ?? []).map((a: any) => a.overall_score).filter((s: any) => s != null);
        results.push({ location_id: locId, location_name: data?.[0]?.locations?.name ?? locId, audit_count: scores.length, avg_score: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null, min_score: scores.length > 0 ? Math.min(...scores) : null, max_score: scores.length > 0 ? Math.max(...scores) : null });
      }
      return { date_range: { from: args.from, to: args.to }, comparisons: results };
    }

    case "get_open_corrective_actions": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      let q = sb.from("corrective_actions").select("id, title, severity, status, due_date, created_at, location_id, locations(name), assigned_to")
        .in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.severity) q = q.eq("severity", args.severity);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_date: ca.due_date, location: ca.locations?.name, assigned_to: ca.assigned_to })) };
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
      const { file_url, file_name, intent } = args;
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

        if (intent === "audit_template") {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
          const parseResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: `Analyze this document and extract it as a structured audit template. Return a JSON object with: template_name (string), description (string), sections (array of { name: string, fields: array of { name: string, field_type: "yes_no"|"rating"|"text"|"number"|"checkbox"|"photo", is_required: boolean } }). Only return valid JSON, no markdown fences.` },
                  { type: "image_url", image_url: { url: file_url } },
                ],
              }],
              stream: false,
            }),
          });
          if (!parseResp.ok) return { error: "Failed to parse document for audit template extraction." };
          const parseResult = await parseResp.json();
          const content = parseResult.choices?.[0]?.message?.content || "";
          let templateData: any = null;
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) templateData = JSON.parse(jsonMatch[0]);
          } catch {
            return { raw_extraction: content, error: "Could not parse structured data from document." };
          }
          return { type: "audit_template_extraction", file_name, extracted_template: templateData, confidence: "medium", next_step: "Review the extracted template structure and call create_audit_template_draft to finalize." };
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
        const { data } = await sb.from("locations").select("id, name").ilike("name", `%${locationName}%`).limit(1);
        if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
      }

      const draft = {
        location_id: locationId,
        location_name: locationName || null,
        role: args.role,
        shift_date: args.shift_date,
        start_time: args.start_time,
        end_time: args.end_time,
        min_staff: args.min_staff || 1,
        max_staff: args.max_staff || 1,
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
        summary: `${draft.role} at ${locationName || "?"} on ${draft.shift_date} ${draft.start_time}-${draft.end_time}`,
        risk: "medium",
        affected: [locationName, draft.role, draft.shift_date].filter(Boolean),
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
      // Validate pending action
      if (args.pending_action_id) {
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
      if (args.pending_action_id) {
        const { data: pa } = await sbService.from("dash_pending_actions")
          .select("id, status, company_id")
          .eq("id", args.pending_action_id)
          .maybeSingle();
        if (pa && pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
        if (pa && pa.status !== "pending") return { error: `Action already ${pa.status}.` };
      }

      // Create template
      const { data: tmplData, error: tmplError } = await sbService.from("audit_templates").insert({
        company_id: companyId,
        name: args.template_name,
        description: args.description || null,
        template_type: "location_audit",
        is_active: false, // Start as inactive draft
        is_global: false,
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
      for (let si = 0; si < (args.sections || []).length; si++) {
        const sec = args.sections[si];
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
        modules_touched: ["audits"],
      });

      const resultStatus = sectionErrors.length > 0 ? "partial" : "success";
      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: resultStatus,
        title: resultStatus === "success" ? "Audit Template Created" : "Template Created with Warnings",
        summary: `Template "${tmplData.name}" created (inactive/draft). ${sectionErrors.length > 0 ? `${sectionErrors.length} section errors.` : "All sections and fields added successfully."}`,
        changes: [`Template "${tmplData.name}" created`, `${args.sections?.length || 0} sections added`],
        errors: sectionErrors.length > 0 ? sectionErrors : undefined,
      }));

      return {
        type: "audit_template_created",
        template_id: tmplData.id,
        template_name: tmplData.name,
        section_errors: sectionErrors,
        message: `Audit template "${tmplData.name}" created as inactive draft. ${sectionErrors.length > 0 ? `${sectionErrors.length} issues with sections.` : "Ready to activate in Audit Templates."}`,
      };
    }

    case "reassign_corrective_action": {
      // Validate CA exists and belongs to company
      const { data: caData, error: caError } = await sb.from("corrective_actions")
        .select("id, title, assigned_to, location_id, locations(name), company_id")
        .eq("id", args.corrective_action_id)
        .maybeSingle();

      if (caError || !caData) return { error: "Corrective action not found." };
      if (caData.company_id !== companyId) return { error: "Cross-tenant action rejected." };

      // Create pending action for high-risk reassignment
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
          new_assigned_name: args.new_assigned_name,
          reason: args.reason,
        },
        status: "pending",
      }).select("id").single();

      // Execute the reassignment
      const { error: updateError } = await sbService.from("corrective_actions")
        .update({ assigned_to: args.new_assigned_to, updated_at: new Date().toISOString() })
        .eq("id", args.corrective_action_id)
        .eq("company_id", companyId);

      if (updateError) {
        await sbService.from("dash_pending_actions")
          .update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() })
          .eq("id", paData?.id);

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
        .eq("id", paData?.id);

      await sbService.from("dash_action_log").insert({
        company_id: companyId,
        user_id: userId,
        action_type: "write",
        action_name: "reassign_corrective_action",
        risk_level: "high",
        request_json: args,
        result_json: { ca_id: caData.id, new_assigned_to: args.new_assigned_to },
        status: "success",
        approval_status: "approved",
        entities_affected: [caData.id],
        modules_touched: ["corrective_actions"],
      });

      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: "success",
        title: "Corrective Action Reassigned",
        summary: `"${caData.title}" reassigned to ${args.new_assigned_name || args.new_assigned_to}.`,
        changes: [`CA "${caData.title}" reassigned`, `New assignee: ${args.new_assigned_name || args.new_assigned_to}`],
      }));

      return {
        type: "ca_reassigned",
        ca_id: caData.id,
        ca_title: caData.title,
        new_assigned_to: args.new_assigned_to,
        message: `Corrective action "${caData.title}" reassigned successfully.`,
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
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `Analyze this SOP/procedure document and extract it as a training module. Return a JSON object with: { module_name: string, description: string, sections: [{ title: string, key_points: string[], duration_minutes: number }], quiz_questions: [{ question: string, options: string[], correct_answer_index: number }], estimated_total_duration_minutes: number }. Only return valid JSON, no markdown fences.` },
                { type: "image_url", image_url: { url: args.file_url } },
              ],
            }],
            stream: false,
          }),
        });
        if (!resp.ok) return { error: "Failed to parse SOP document." };
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

    case "transform_compliance_doc_to_audit": {
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
                { type: "text", text: `Analyze this compliance/regulation document and create a recurring audit template that covers its requirements. Return a JSON object with: { template_name: string, description: string, regulation_reference: string, suggested_recurrence: "daily"|"weekly"|"monthly", sections: [{ name: string, fields: [{ name: string, field_type: "yes_no"|"rating"|"text"|"number"|"checkbox"|"photo", is_required: boolean, regulation_clause?: string }] }] }. Only return valid JSON, no markdown fences.` },
                { type: "image_url", image_url: { url: args.file_url } },
              ],
            }],
            stream: false,
          }),
        });
        if (!resp.ok) return { error: "Failed to parse compliance document." };
        const result = await resp.json();
        const content = result.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (args.regulation_name) parsed.regulation_reference = args.regulation_name;
            return { type: "compliance_audit_extraction", file_name: args.file_name, ...parsed, next_step: "Review the suggested audit template and call create_audit_template_draft to finalize." };
          }
        } catch {}
        return { raw_extraction: content, error: "Could not parse compliance audit structure." };
      } catch (err: any) {
        return { error: `Compliance doc extraction failed: ${err.message}` };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── System Prompt Builder ──────────────────────────────────
function buildSystemPrompt(ctx: { role: string; companyName: string; modules: string[]; locations: string[] }): string {
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
- **Audit Template from PDF**: Parse PDF/image documents → create structured audit template draft

### Draft & Execute (APPROVAL-GATED WRITES)
You can now create AND execute records in the platform:

**Employee Creation Flow:**
1. Use \`create_employee_draft\` to prepare the draft and show preview
2. Wait for the user to say "approve", "confirm", "yes", "go ahead", or similar
3. ONLY THEN call \`execute_employee_creation\` with the pending_action_id and draft data
4. Never execute without explicit user confirmation

**Audit Template Creation Flow:**
1. Use \`create_audit_template_draft\` to prepare the draft
2. Wait for user approval
3. Call \`execute_audit_template_creation\` with the pending_action_id

**Corrective Action Reassignment:**
- Use \`reassign_corrective_action\` when user explicitly asks to reassign
- This is a HIGH RISK action — clearly explain what will change before executing

**Shift Creation Flow:**
1. Use \`create_shift_draft\` to prepare and show preview
2. Wait for user approval before creating

### Approval Rules
- MEDIUM risk: User must confirm with clear affirmative response
- HIGH risk: Show detailed impact summary, list affected entities, then confirm
- NEVER skip the approval step for write operations
- If the user says "approve" or "confirm" or "yes" in response to a draft, execute the corresponding action using the pending_action_id

### Memory & Personalization
- **User Preferences**: Save/recall user preferences (report format, default date ranges, favorite locations) using \`save_user_preference\` and \`get_user_preferences\`. Check preferences at the start of complex queries to personalize output.
- **Organization Memory**: Save/recall company-specific terminology and processes using \`save_org_memory\` and \`get_org_memory\`. When the user says "we call X as Y" or "our standard is...", save it.
- **Saved Workflows**: Save reusable prompt shortcuts using \`save_workflow\`. When user says "save this as a shortcut" or "remember this report", save the prompt.

### File Transformations (Extended)
- **Spreadsheet → Schedule**: Use \`transform_spreadsheet_to_schedule\` to parse CSV/Excel into shift drafts
- **SOP → Training Module**: Use \`transform_sop_to_training\` to convert procedure documents into training content
- **Compliance Doc → Audit Template**: Use \`transform_compliance_doc_to_audit\` to generate recurring audit templates from regulations

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
    const { messages, session_id } = await req.json();
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

    const systemPrompt = buildSystemPrompt({ role: displayRole, companyName, modules: activeModules, locations: locationNames });
    let conversationMessages = [{ role: "system", content: systemPrompt }, ...messages];

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
        for (const tc of msg.tool_calls) {
          let args: any;
          try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
          toolsUsed.push(tc.function.name);
          const toolResult = await executeTool(sb, sbService, tc.function.name, args, companyId, userId, displayRole, activeModules, allStructuredEvents);
          conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
        }
        continue;
      }

      // Final text response — stream it with structured events
      const finalContent = msg.content || "";

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
          modules_touched: [...new Set(toolsUsed.map(t => {
            if (t.includes("audit")) return "audits";
            if (t.includes("employee") || t.includes("attendance") || t.includes("shift")) return "workforce";
            if (t.includes("task")) return "tasks";
            if (t.includes("corrective")) return "corrective_actions";
            if (t.includes("work_order")) return "cmms";
            if (t.includes("document")) return "documents";
            if (t.includes("training")) return "training";
            return "general";
          }))],
        });
      } catch (logErr) {
        console.error("Failed to log Dash action:", logErr);
      }

      // Save/update session
      if (session_id) {
        try {
          await sbService.from("dash_sessions").upsert({
            id: session_id,
            company_id: companyId,
            user_id: userId,
            title: messages?.[0]?.content?.substring(0, 100) || "Dash conversation",
            messages_json: [...messages, { role: "assistant", content: finalContent }],
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

    return new Response(JSON.stringify({ error: "Max iterations exceeded" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dash command error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
