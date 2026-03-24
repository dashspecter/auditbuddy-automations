import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Shared Capability Layer Imports ───
import { DEFAULT_TIMEZONE } from "./shared/constants.ts";
import { resultToToolResponse, success, capabilityError } from "./shared/contracts.ts";
import { type PermissionContext } from "./shared/permissions.ts";
import { makeStructuredEvent } from "./shared/utils.ts";
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

// ─── Domain Capability Imports ───
import { getAuditResults, compareLocationPerformance, createAuditTemplateDraft, executeAuditTemplateCreation } from "./capabilities/audits.ts";
import { getOpenCorrectiveActions, reassignCorrectiveAction, executeCaReassignment } from "./capabilities/corrective-actions.ts";
import { searchEmployees, getAttendanceExceptions, createEmployeeDraft, createShiftDraft, executeEmployeeCreation, executeShiftCreation, updateShiftDraft, executeShiftUpdate, deleteShiftDraft, executeShiftDeletion, swapShiftDraft, executeShiftSwap } from "./capabilities/workforce.ts";
import { getTaskCompletionSummary, getWorkOrderStatus, getDocumentExpiries, getTrainingGaps } from "./capabilities/operations.ts";
import { searchLocations, getLocationOverview, getCrossModuleSummary } from "./capabilities/overview.ts";
import { saveUserPreference, getUserPreferences, saveOrgMemory, getOrgMemory, saveWorkflow, listSavedWorkflows } from "./capabilities/memory.ts";
import { downloadFileAsBase64 as dlFileBase64, transformSpreadsheetToSchedule, transformSopToTraining, parseUploadedFile } from "./capabilities/file-processing.ts";
import { CAPABILITY_REGISTRY } from "./registry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  update_shift_draft: "workforce",
  execute_shift_update: "workforce",
  delete_shift_draft: "workforce",
  execute_shift_deletion: "workforce",
  swap_shift_draft: "workforce",
  execute_shift_swap: "workforce",
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
  update_shift: "execute_shift_update",
  delete_shift: "execute_shift_deletion",
  swap_shifts: "execute_shift_swap",
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
    case "update_shift":
      return { pending_action_id: previewJson.pending_action_id };
    case "delete_shift":
      return { pending_action_id: previewJson.pending_action_id };
    case "swap_shifts":
      return { pending_action_id: previewJson.pending_action_id };
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

// ─── Permission Context Builder ─────────────────────────────
function buildPermCtx(companyId: string, userId: string, platformRoles: string[], companyRole: string, activeModules: string[]): PermissionContext {
  return { companyId, actorUserId: userId, platformRoles, companyRole, activeModules };
}

// downloadFileAsBase64 is now imported from capabilities/file-processing.ts as dlFileBase64


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



// ─── Tool Definitions (extracted to tools.ts) ───────────────
import { tools } from "./tools.ts";

// ─── Tool Execution ─────────────────────────────────────────
async function executeTool(
  sb: any, sbService: any, name: string, args: any, 
  companyId: string, userId: string, platformRoles: string[], companyRole: string, activeModules: string[],
  structuredEvents: string[]
): Promise<any> {
  // Module gating check
  const requiredModule = TOOL_MODULE_MAP[name];
  if (requiredModule && !activeModules.includes(requiredModule)) {
    return { error: `The "${requiredModule}" module is not active for your company. Please enable it in Billing & Modules.`, recoverable: false };
  }

  try {
    return await executeToolInner(sb, sbService, name, args, companyId, userId, platformRoles, companyRole, activeModules, structuredEvents);
  } catch (err: any) {
    console.error(`[Dash] Tool "${name}" error:`, err);
    return { error: `Tool "${name}" failed: ${err.message || "Unknown error"}. You may retry this request.`, recoverable: true };
  }
}

async function executeToolInner(
  sb: any, sbService: any, name: string, args: any,
  companyId: string, userId: string, platformRoles: string[], companyRole: string, activeModules: string[],
  structuredEvents: string[]
): Promise<any> {
  switch (name) {

    // ────────── OVERVIEW & LOCATION TOOLS ──────────
    case "search_locations":
      return resultToToolResponse(await searchLocations(sb, companyId, args));

    case "search_employees":
      return resultToToolResponse(await searchEmployees(sb, companyId, args));

    case "get_location_overview":
      return resultToToolResponse(await getLocationOverview(sb, companyId, args));

    case "get_cross_module_summary":
      return resultToToolResponse(await getCrossModuleSummary(sb, companyId, args, utcRange));

    // ────────── AUDIT TOOLS ──────────
    case "get_audit_results":
      return resultToToolResponse(await getAuditResults(sb, companyId, args, structuredEvents));

    case "compare_location_performance":
      return resultToToolResponse(await compareLocationPerformance(sb, companyId, args, structuredEvents));

    // ────────── CORRECTIVE ACTIONS ──────────
    case "get_open_corrective_actions":
      return resultToToolResponse(await getOpenCorrectiveActions(sb, companyId, args));

    // ────────── OPERATIONS ──────────
    case "get_task_completion_summary":
      return resultToToolResponse(await getTaskCompletionSummary(sb, companyId, args));

    case "get_attendance_exceptions":
      return resultToToolResponse(await getAttendanceExceptions(sb, companyId, args, utcRange));

    case "get_work_order_status":
      return resultToToolResponse(await getWorkOrderStatus(sb, companyId, args));

    case "get_document_expiries":
      return resultToToolResponse(await getDocumentExpiries(sb, companyId, args));

    case "get_training_gaps":
      return resultToToolResponse(await getTrainingGaps(sb, companyId, args));

    // ────────── DRAFT TOOLS (with permission context) ──────────
    case "create_employee_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await createEmployeeDraft(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "create_audit_template_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await createAuditTemplateDraft(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "create_shift_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await createShiftDraft(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "reassign_corrective_action": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await reassignCorrectiveAction(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "update_shift_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await updateShiftDraft(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "delete_shift_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await deleteShiftDraft(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "swap_shift_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await swapShiftDraft(sb, sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "execute_employee_creation": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeEmployeeCreation(sbService, companyId, userId, args, structuredEvents, hydrateArgsFromDraft, ctx));
    }

    case "execute_audit_template_creation": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeAuditTemplateCreation(sbService, companyId, userId, args, structuredEvents, hydrateArgsFromDraft, ctx));
    }

    case "execute_shift_creation": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeShiftCreation(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "execute_ca_reassignment": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeCaReassignment(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "execute_shift_update": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeShiftUpdate(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "execute_shift_deletion": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeShiftDeletion(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "execute_shift_swap": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await executeShiftSwap(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    case "save_user_preference":
      return resultToToolResponse(await saveUserPreference(sbService, companyId, userId, args));

    case "get_user_preferences":
      return resultToToolResponse(await getUserPreferences(sb, userId));

    case "save_org_memory":
      return resultToToolResponse(await saveOrgMemory(sbService, companyId, userId, args));

    case "get_org_memory":
      return resultToToolResponse(await getOrgMemory(sb, companyId, args));

    case "save_workflow":
      return resultToToolResponse(await saveWorkflow(sbService, companyId, userId, args));

    case "list_saved_workflows":
      return resultToToolResponse(await listSavedWorkflows(sb, companyId, userId));

    // ────────── FILE PROCESSING TOOLS ──────────
    case "transform_spreadsheet_to_schedule":
      return resultToToolResponse(await transformSpreadsheetToSchedule(args));

    case "transform_sop_to_training":
      return resultToToolResponse(await transformSopToTraining(sbService, args));

    case "transform_compliance_doc_to_audit": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await parseUploadedFile(sbService, companyId, userId, { ...args, intent: "compliance_audit" }, structuredEvents, ctx));
    }

    case "parse_uploaded_file": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await parseUploadedFile(sbService, companyId, userId, args, structuredEvents, ctx));
    }

    // ────────── TIME-OFF CAPABILITY TOOLS ──────────
    case "get_time_off_balance": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await getTimeOffBalance(sb, ctx, { employee_id: args.employee_id, employee_name: args.employee_name }));
    }

    case "list_time_off_requests": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await listTimeOffRequests(sb, ctx, { employee_name: args.employee_name, status: args.status, from: args.from, to: args.to });
      if (result.ok && result.data.requests.length > 0) {
        structuredEvents.push(makeStructuredEvent("data_table", {
          title: "Time-Off Requests",
          columns: ["Employee", "Type", "Start", "End", "Days", "Status"],
          rows: result.data.requests.map((r: any) => [r.employee_name, r.request_type, r.start_date, r.end_date, r.days, r.status]),
        }));
      }
      return resultToToolResponse(result);
    }

    case "list_pending_time_off_approvals": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await listPendingApprovals(sb, ctx);
      if (result.ok && result.data.requests.length > 0) {
        structuredEvents.push(makeStructuredEvent("data_table", {
          title: "Pending Time-Off Approvals",
          columns: ["Employee", "Type", "Start", "End", "Days", "Annual Days"],
          rows: result.data.requests.map((r: any) => [r.employee_name, r.request_type, r.start_date, r.end_date, r.days, r.annual_vacation_days]),
        }));
      }
      return resultToToolResponse(result);
    }

    case "check_time_off_conflicts": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      return resultToToolResponse(await checkTimeOffConflicts(sb, ctx, { employee_id: args.employee_id, employee_name: args.employee_name, start_date: args.start_date, end_date: args.end_date }));
    }

    case "get_team_time_off_calendar": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await getTeamTimeOffCalendar(sb, ctx, { location_name: args.location_name, from: args.from, to: args.to });
      if (result.ok && result.data.entries.length > 0) {
        structuredEvents.push(makeStructuredEvent("data_table", {
          title: `Team Time-Off (${args.from} — ${args.to})`,
          columns: ["Employee", "Location", "Type", "Start", "End", "Days"],
          rows: result.data.entries.map((e: any) => [e.employee_name, e.location, e.request_type, e.start_date, e.end_date, e.days]),
        }));
      }
      return resultToToolResponse(result);
    }

    case "create_time_off_request_draft": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      // Pre-validate via capability layer
      const conflicts = await checkTimeOffConflicts(sb, ctx, { employee_name: args.employee_name, employee_id: args.employee_id, start_date: args.start_date, end_date: args.end_date });

      const draft = {
        employee_name: args.employee_name,
        employee_id: args.employee_id,
        start_date: args.start_date,
        end_date: args.end_date,
        request_type: args.request_type || "vacation",
        reason: args.reason || null,
      };

      // Calculate days for display
      const start = new Date(args.start_date);
      const end = new Date(args.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Store pending action
      const { data: paData } = await sbService.from("dash_pending_actions").insert({
        company_id: companyId,
        user_id: userId,
        action_name: "create_time_off_request",
        action_type: "write",
        risk_level: "medium",
        preview_json: draft,
        status: "pending",
      }).select("id").single();

      const conflictWarning = conflicts.ok && conflicts.data.has_conflicts
        ? ` ⚠️ Conflicts detected: ${conflicts.data.employee_overlaps.length} personal overlap(s), ${conflicts.data.team_overlaps.length} team overlap(s).`
        : "";

      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: "Create Time-Off Request",
        summary: `${args.request_type || "vacation"} for ${args.employee_name || "employee"} from ${args.start_date} to ${args.end_date} (${days} days).${conflictWarning}`,
        risk: "medium",
        affected: [args.employee_name, `${days} days`, args.request_type].filter(Boolean),
        pending_action_id: paData?.id,
        draft,
        can_approve: true,
      }));

      return resultToToolResponse(success({
        type: "time_off_draft",
        draft,
        days,
        pending_action_id: paData?.id,
        conflicts: conflicts.ok ? conflicts.data : null,
        requires_approval: true,
        risk_level: "medium",
        message: `Time-off draft created for ${args.employee_name || "employee"} (${days} days).${conflictWarning} Please approve to proceed.`,
      }));
    }

    case "execute_time_off_request": {
      if (!args.pending_action_id) return resultToToolResponse(capabilityError("Missing pending_action_id."));
      const { data: pa } = await sbService.from("dash_pending_actions")
        .select("id, status, company_id, preview_json")
        .eq("id", args.pending_action_id)
        .maybeSingle();
      if (!pa) return resultToToolResponse(capabilityError("Pending action not found."));
      if (pa.company_id !== companyId) return resultToToolResponse(capabilityError("Cross-tenant action rejected."));
      if (pa.status !== "pending") return resultToToolResponse(capabilityError(`Action already ${pa.status}.`));

      const preview = pa.preview_json as any;
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await createTimeOffRequest(sb, sbService, ctx, {
        employee_id: preview.employee_id,
        employee_name: preview.employee_name,
        start_date: preview.start_date,
        end_date: preview.end_date,
        request_type: preview.request_type,
        reason: preview.reason,
      });

      if (result.ok) {
        await sbService.from("dash_pending_actions").update({
          status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
          execution_result: result.data, updated_at: new Date().toISOString(),
        }).eq("id", pa.id);

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "success",
          title: "Time-Off Request Created",
          summary: `${result.data.employee_name}: ${preview.request_type} from ${preview.start_date} to ${preview.end_date} (${result.data.days} days) — ${result.data.status}.`,
          changes: [`Request created for ${result.data.employee_name}`, `Status: ${result.data.status}`, `${result.data.days} days`],
        }));
      } else {
        await sbService.from("dash_pending_actions").update({
          status: "failed", execution_result: result, updated_at: new Date().toISOString(),
        }).eq("id", pa.id);

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "error",
          title: "Time-Off Request Failed",
          summary: resultToToolResponse(result).error,
          errors: [resultToToolResponse(result).error],
        }));
      }
      return resultToToolResponse(result);
    }

    case "approve_time_off_request_draft": {
      // Create a draft to approve — user must confirm
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      
      // Resolve the request to show preview
      let requestInfo: any = null;
      if (args.request_id) {
        const { data } = await sb.from("time_off_requests")
          .select("id, employee_id, start_date, end_date, request_type, status, reason, employees:employee_id(full_name)")
          .eq("id", args.request_id).eq("company_id", companyId).maybeSingle();
        requestInfo = data;
      } else if (args.employee_name) {
        const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
        if (emps?.[0]) {
          const { data } = await sb.from("time_off_requests")
            .select("id, employee_id, start_date, end_date, request_type, status, reason, employees:employee_id(full_name)")
            .eq("employee_id", emps[0].id).eq("company_id", companyId).eq("status", "pending")
            .order("created_at", { ascending: false }).limit(1);
          requestInfo = data?.[0];
        }
      }

      if (!requestInfo) return resultToToolResponse(capabilityError("No pending time-off request found for this employee."));
      if (requestInfo.status !== "pending") return resultToToolResponse(capabilityError(`Request is already "${requestInfo.status}".`));

      const draft = {
        request_id: requestInfo.id,
        employee_name: requestInfo.employees?.full_name || args.employee_name,
        start_date: requestInfo.start_date,
        end_date: requestInfo.end_date,
        request_type: requestInfo.request_type,
      };

      const { data: paData } = await sbService.from("dash_pending_actions").insert({
        company_id: companyId,
        user_id: userId,
        action_name: "approve_time_off_request",
        action_type: "write",
        risk_level: "medium",
        preview_json: draft,
        status: "pending",
      }).select("id").single();

      const days = Math.ceil((new Date(requestInfo.end_date).getTime() - new Date(requestInfo.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

      structuredEvents.push(makeStructuredEvent("action_preview", {
        action: "Approve Time-Off Request",
        summary: `Approve ${draft.employee_name}'s ${draft.request_type} request: ${draft.start_date} to ${draft.end_date} (${days} days).`,
        risk: "medium",
        affected: [draft.employee_name, `${days} days`, draft.request_type],
        pending_action_id: paData?.id,
        draft,
        can_approve: true,
      }));

      return resultToToolResponse(success({
        type: "time_off_approval_draft",
        draft,
        pending_action_id: paData?.id,
        requires_approval: true,
        message: `Ready to approve ${draft.employee_name}'s time-off. Please confirm.`,
      }));
    }

    case "execute_time_off_approval": {
      if (!args.pending_action_id) return resultToToolResponse(capabilityError("Missing pending_action_id."));
      const { data: pa } = await sbService.from("dash_pending_actions")
        .select("id, status, company_id, preview_json")
        .eq("id", args.pending_action_id).maybeSingle();
      if (!pa) return resultToToolResponse(capabilityError("Pending action not found."));
      if (pa.company_id !== companyId) return resultToToolResponse(capabilityError("Cross-tenant action rejected."));
      if (pa.status !== "pending") return resultToToolResponse(capabilityError(`Action already ${pa.status}.`));

      const preview = pa.preview_json as any;
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await approveTimeOffRequest(sb, sbService, ctx, { request_id: preview.request_id, employee_name: preview.employee_name });

      if (result.ok) {
        await sbService.from("dash_pending_actions").update({
          status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
          execution_result: result.data, updated_at: new Date().toISOString(),
        }).eq("id", pa.id);

        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "success",
          title: "Time-Off Approved",
          summary: `${result.data.employee_name}'s time-off request has been approved.`,
          changes: [`Approved for ${result.data.employee_name}`],
        }));
      } else {
        await sbService.from("dash_pending_actions").update({
          status: "failed", execution_result: result, updated_at: new Date().toISOString(),
        }).eq("id", pa.id);
      }
      return resultToToolResponse(result);
    }

    case "reject_time_off_request_dash": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await rejectTimeOffRequest(sb, sbService, ctx, { request_id: args.request_id, employee_name: args.employee_name, rejection_reason: args.rejection_reason });
      if (result.ok) {
        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "success",
          title: "Time-Off Rejected",
          summary: `${result.data.employee_name}'s time-off request has been rejected.${args.rejection_reason ? ` Reason: ${args.rejection_reason}` : ""}`,
          changes: [`Rejected for ${result.data.employee_name}`],
        }));
      }
      return resultToToolResponse(result);
    }

    case "cancel_time_off_request_dash": {
      const ctx = buildPermCtx(companyId, userId, platformRoles, companyRole, activeModules);
      const result = await cancelTimeOffRequest(sb, sbService, ctx, { request_id: args.request_id });
      if (result.ok) {
        structuredEvents.push(makeStructuredEvent("execution_result", {
          status: "success",
          title: "Time-Off Cancelled",
          summary: `${result.data.employee_name}'s time-off request has been cancelled.`,
          changes: [`Cancelled for ${result.data.employee_name}`],
        }));
      }
      return resultToToolResponse(result);
    }

    default:
      return resultToToolResponse(capabilityError(`Unknown tool: ${name}`));
  }
}

// ─── Dynamic Capability Docs from Registry ──────────────────
function generateCapabilityDocs(): string {
  const sections: string[] = [];
  for (const [domain, cap] of Object.entries(CAPABILITY_REGISTRY)) {
    if (cap.maturity === "planned") continue;
    const label = domain.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const tools = [...cap.reads, ...cap.actions];
    const toolList = tools.length > 0 ? tools.map((t: string) => `\`${t}\``).join(", ") : "_no tools_";
    const aliases = cap.aliases.slice(0, 6).join(", ");
    sections.push(`- **${label}** (${cap.maturity}): ${toolList}\n  Aliases: ${aliases}`);
  }
  return sections.join("\n");
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
- **CRITICAL DATE RULE**: When the user says "this week", "last week", "this month", "last 30 days", "today", "yesterday", or ANY relative date expression, you MUST auto-resolve it to concrete YYYY-MM-DD dates using the Today value above. NEVER ask the user to specify dates. Examples: "this week" = Monday of current week to today. "last 30 days" = today minus 30 to today. "last month" = first to last day of previous month.

## Your Capabilities (auto-generated from registry)

${generateCapabilityDocs()}

### File Processing
- **ID Scan**: Extract employee data from uploaded ID card photos → create employee draft
- **Audit Template from PDF**: Parse PDF/image documents → create structured audit template draft. Use \`parse_uploaded_file\` with intent \`audit_template\`.
- **Compliance Audit from PDF**: Parse compliance/regulation documents → create recurring audit template. Use \`parse_uploaded_file\` with intent \`compliance_audit\`.
- **CRITICAL FILE RULE**: When the user message contains \`[File URLs:\`, you MUST call \`parse_uploaded_file\` with the file URL. NEVER respond with text saying you cannot parse or process a file. ALWAYS use the tool.
- **NAME OVERRIDE RULE**: When the user specifies a custom name for the audit template (e.g. "name it X", "call it Y", "with the name Z"), you MUST pass it as \`requested_template_name\` to \`parse_uploaded_file\`. This overrides the AI-extracted title.

### Draft & Execute (APPROVAL-GATED WRITES)
You can now create AND execute records in the platform:

**CRITICAL — STOP AFTER DRAFT**: After calling ANY draft tool (create_employee_draft, create_audit_template_draft, create_shift_draft, update_shift_draft, delete_shift_draft, swap_shift_draft, reassign_corrective_action), you MUST immediately STOP making tool calls and present the draft preview to the user. Do NOT call any execute tool in the same response. The approval card UI will handle the approval flow. You must wait for the NEXT user message containing explicit approval before executing.

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
      const toolResult = await executeTool(sb, sbService, toolName, hydratedArgs, companyId, userId, platformRoles, companyRole, activeModules, allStructuredEvents);
      
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
          const toolResult = await executeTool(sb, sbService, toolName, args, companyId, userId, platformRoles, companyRole, activeModules, allStructuredEvents);
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
          const fallbackResult = await executeTool(sb, sbService, "parse_uploaded_file", { file_url: fileUrl, file_name: fileName, intent }, companyId, userId, platformRoles, companyRole, activeModules, allStructuredEvents);
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
