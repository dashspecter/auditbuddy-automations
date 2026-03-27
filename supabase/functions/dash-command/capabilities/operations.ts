/**
 * Operations Capability Module
 * Grouped smaller domains: Tasks, CMMS, Documents, Training.
 * Phase 8: Standardized on CapabilityResult.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


export async function getTaskCompletionSummary(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Defense-in-depth: task_completions has no company_id column, scope via tasks
  const { data: companyTasks } = await sb.from("tasks").select("id").eq("company_id", companyId);
  const taskIds = (companyTasks ?? []).map((t: any) => t.id);
  if (taskIds.length === 0) return success({ date_range: { from: args.from, to: args.to }, completions_count: 0 });

  let q = sb.from("task_completions").select("id, completed_at, task_id, tasks(title, location_id, locations(name))").in("task_id", taskIds).gte("completed_at", args.from).lte("completed_at", args.to + "T23:59:59Z");
  if (args.location_id) q = q.eq("tasks.location_id", args.location_id);
  const { data, error } = await q.limit(500);
  if (error) return capabilityError(error.message);
  return success({ date_range: { from: args.from, to: args.to }, completions_count: (data ?? []).length });
}

export async function getWorkOrderStatus(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  let q = sb.from("cmms_work_orders").select("id, title, status, priority, created_at, location_id, locations(name)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  if (args.status) q = q.eq("status", args.status);
  else q = q.in("status", ["open", "in_progress"]);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    work_orders: c.items.map((w: any) => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, location: w.locations?.name })),
    total: c.total, returned: c.returned, truncated: c.truncated,
  });
}

export async function getDocumentExpiries(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const daysAhead = args.days_ahead || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const { data, error } = await sb.from("documents").select("id, title, expiry_date, status").eq("company_id", companyId).not("expiry_date", "is", null).lte("expiry_date", cutoff.toISOString()).order("expiry_date", { ascending: true }).limit(50);
  if (error) return capabilityError(error.message);
  return success({ days_ahead: daysAhead, documents: (data ?? []).map((d: any) => ({ id: d.id, title: d.title, expiry_date: d.expiry_date, expired: new Date(d.expiry_date) < new Date() })) });
}

export async function getTrainingGaps(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let q = sb.from("training_assignments").select("id, trainee_employee_id, employees!training_assignments_trainee_employee_id_fkey(full_name, location_id, locations(name)), module_id, training_programs(name), status, start_date")
    .eq("company_id", companyId).in("status", ["assigned", "in_progress"]);
  if (args.location_id) q = q.eq("employees.location_id", args.location_id);
  const { data, error } = await q.limit(100);
  if (error) return capabilityError(error.message);
  const overdue = (data ?? []).filter((a: any) => a.start_date && new Date(a.start_date) < new Date());
  return success({ total_incomplete: (data ?? []).length, overdue_count: overdue.length, gaps: (data ?? []).map((a: any) => ({ employee: a.employees?.full_name, module: a.training_programs?.name, status: a.status, due_date: a.start_date, location: a.employees?.locations?.name })) });
}

// ─── B3: Employee Management ───

import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

export async function updateEmployeeDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Find employee
  let emp: any = null;
  if (args.employee_id) {
    const { data } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name), email, phone").eq("id", args.employee_id).eq("company_id", companyId).maybeSingle();
    emp = data;
  } else if (args.employee_name) {
    const { data } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name), email, phone").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
    emp = data?.[0];
  }
  if (!emp) return capabilityError("Employee not found.");

  const changes: Record<string, { old: any; new: any }> = {};
  if (args.new_role && args.new_role !== emp.role) changes.role = { old: emp.role, new: args.new_role };
  if (args.new_status && args.new_status !== emp.status) changes.status = { old: emp.status, new: args.new_status };
  if (args.new_email && args.new_email !== emp.email) changes.email = { old: emp.email, new: args.new_email };
  if (args.new_phone && args.new_phone !== emp.phone) changes.phone = { old: emp.phone, new: args.new_phone };

  // Resolve new location
  let newLocationId = args.new_location_id || null;
  let newLocationName = args.new_location_name || null;
  if (newLocationName && !newLocationId) {
    const { data: locData } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${newLocationName}%`).limit(1);
    if (locData?.[0]) { newLocationId = locData[0].id; newLocationName = locData[0].name; }
  }
  if (newLocationId && newLocationId !== emp.location_id) changes.location_id = { old: emp.location_id, new: newLocationId };

  if (Object.keys(changes).length === 0) return capabilityError("No changes specified.");

  const draft = { employee_id: emp.id, employee_name: emp.full_name, changes, new_location_name: newLocationName, reason: args.reason };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_employee",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  const changeSummary = Object.entries(changes).map(([k, v]) => `${k}: ${v.old} → ${v.new}`).join(", ");
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update Employee: ${emp.full_name}`,
    summary: changeSummary,
    risk: "medium", affected: [emp.full_name], pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "employee_update_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `Employee update draft ready. Changes: ${changeSummary}` });
}

export async function executeEmployeeUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const updateFields: any = { updated_at: new Date().toISOString() };
  for (const [key, val] of Object.entries(draft.changes as Record<string, { new: any }>)) {
    updateFields[key] = val.new;
  }

  const { error } = await sbService.from("employees").update(updateFields).eq("id", draft.employee_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Employee Update Failed", summary: error.message, errors: [error.message] }));
    return capabilityError(`Update failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.update_employee", actionType: "write", riskLevel: "medium", request: draft, result: { employee_id: draft.employee_id }, entitiesAffected: [draft.employee_id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Employee Updated", summary: `"${draft.employee_name}" updated successfully.`, changes: Object.entries(draft.changes).map(([k, v]: any) => `${k}: ${v.old} → ${v.new}`) }));
  return success({ type: "employee_updated", employee_id: draft.employee_id, message: `Employee "${draft.employee_name}" updated.` });
}

export async function deactivateEmployeeDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  let emp: any = null;
  if (args.employee_id) {
    const { data } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)").eq("id", args.employee_id).eq("company_id", companyId).maybeSingle();
    emp = data;
  } else if (args.employee_name) {
    const { data } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
    emp = data?.[0];
  }
  if (!emp) return capabilityError("Employee not found.");
  if (emp.status === "inactive") return capabilityError(`"${emp.full_name}" is already inactive.`);

  const draft = { employee_id: emp.id, employee_name: emp.full_name, current_role: emp.role, location: emp.locations?.name, reason: args.reason };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "deactivate_employee",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Deactivate Employee: ${emp.full_name}`,
    summary: `Set "${emp.full_name}" (${emp.role} at ${emp.locations?.name}) to inactive.${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "high", affected: [emp.full_name, emp.locations?.name].filter(Boolean),
    pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "employee_deactivate_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `Deactivation draft for "${emp.full_name}" ready. Approve to proceed.` });
}

export async function executeEmployeeDeactivation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { error } = await sbService.from("employees").update({ status: "inactive", updated_at: new Date().toISOString() }).eq("id", draft.employee_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Deactivation failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.deactivate_employee", actionType: "write", riskLevel: "high", request: draft, result: { employee_id: draft.employee_id }, entitiesAffected: [draft.employee_id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Employee Deactivated", summary: `"${draft.employee_name}" has been deactivated.`, changes: [`${draft.employee_name} → inactive`] }));
  return success({ type: "employee_deactivated", employee_id: draft.employee_id, message: `"${draft.employee_name}" deactivated.` });
}

// ─── B4: Attendance Corrections ───

export async function correctAttendanceDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Find attendance log
  let log: any = null;
  if (args.attendance_log_id) {
    const { data } = await sb.from("attendance_logs").select("id, staff_id, employees(full_name, company_id), check_in_at, check_out_at, is_late, location_id, locations(name)").eq("id", args.attendance_log_id).maybeSingle();
    log = data;
    if (log && log.employees?.company_id !== companyId) return capabilityError("Cross-tenant rejected.");
  } else if (args.employee_name && args.date) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
    if (emps?.[0]) {
      const { data } = await sb.from("attendance_logs").select("id, staff_id, employees(full_name, company_id), check_in_at, check_out_at, is_late, location_id, locations(name)")
        .eq("staff_id", emps[0].id).gte("check_in_at", `${args.date}T00:00:00`).lt("check_in_at", `${args.date}T23:59:59`).order("check_in_at", { ascending: false }).limit(1);
      log = data?.[0];
    }
  }
  if (!log) return capabilityError("Attendance log not found.");

  const changes: string[] = [];
  const draft: any = { log_id: log.id, employee_name: log.employees?.full_name, check_in_at: log.check_in_at, check_out_at: log.check_out_at };

  if (args.new_check_out) { draft.new_check_out = args.new_check_out; changes.push(`Set checkout to ${args.new_check_out}`); }
  if (args.new_check_in) { draft.new_check_in = args.new_check_in; changes.push(`Set check-in to ${args.new_check_in}`); }
  if (changes.length === 0) return capabilityError("No corrections specified.");
  draft.reason = args.reason;

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "correct_attendance",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Correct Attendance: ${log.employees?.full_name}`,
    summary: changes.join("; ") + (args.reason ? `. Reason: ${args.reason}` : ""),
    risk: "medium", affected: [log.employees?.full_name], pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "attendance_correction_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `Attendance correction draft ready.` });
}

export async function executeAttendanceCorrection(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const updateFields: any = {};
  if (draft.new_check_out) updateFields.check_out_at = draft.new_check_out;
  if (draft.new_check_in) updateFields.check_in_at = draft.new_check_in;
  // Clear auto_clocked_out flag if we're setting a real checkout
  if (draft.new_check_out) updateFields.auto_clocked_out = false;

  const { error } = await sbService.from("attendance_logs").update(updateFields).eq("id", draft.log_id);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Correction failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.correct_attendance", actionType: "write", riskLevel: "medium", request: draft, result: { log_id: draft.log_id }, entitiesAffected: [draft.log_id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Attendance Corrected", summary: `${draft.employee_name}'s attendance corrected.`, changes: Object.keys(updateFields).map(k => `${k} updated`) }));
  return success({ type: "attendance_corrected", log_id: draft.log_id, message: `Attendance for "${draft.employee_name}" corrected.` });
}

export async function excuseLateDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  let log: any = null;
  if (args.attendance_log_id) {
    const { data } = await sb.from("attendance_logs").select("id, staff_id, employees(full_name, company_id), check_in_at, is_late, late_minutes, location_id").eq("id", args.attendance_log_id).maybeSingle();
    log = data;
  } else if (args.employee_name && args.date) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
    if (emps?.[0]) {
      const { data } = await sb.from("attendance_logs").select("id, staff_id, employees(full_name, company_id), check_in_at, is_late, late_minutes, location_id")
        .eq("staff_id", emps[0].id).eq("is_late", true).gte("check_in_at", `${args.date}T00:00:00`).lt("check_in_at", `${args.date}T23:59:59`).limit(1);
      log = data?.[0];
    }
  }
  if (!log) return capabilityError("Late attendance log not found.");
  if (!log.is_late) return capabilityError("This attendance log is not marked as late.");

  const draft = { log_id: log.id, employee_name: log.employees?.full_name, late_minutes: log.late_minutes, reason: args.reason };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "excuse_late_arrival",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Excuse Late Arrival: ${log.employees?.full_name}`,
    summary: `Mark ${log.late_minutes}min late arrival as excused.${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "medium", affected: [log.employees?.full_name], pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "excuse_late_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `Excuse draft ready.` });
}

export async function executeExcuseLate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { error } = await sbService.from("attendance_logs").update({ is_late: false, late_minutes: 0, notes: `Excused: ${draft.reason || "No reason"}` }).eq("id", draft.log_id);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.excuse_late", actionType: "write", riskLevel: "medium", request: draft, result: { log_id: draft.log_id }, entitiesAffected: [draft.log_id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Late Arrival Excused", summary: `${draft.employee_name}'s late arrival excused.`, changes: [`Late flag removed`] }));
  return success({ type: "late_excused", log_id: draft.log_id, message: `${draft.employee_name}'s late arrival excused.` });
}

// ─── B5: Work Order Management ───

export async function createWorkOrderDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "cmms", ctx });
  if (!permCheck.ok) return permCheck;

  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (locationName && !locationId) {
    const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1);
    if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
  }

  const draft = { title: args.title, description: args.description || null, priority: args.priority || "medium", location_id: locationId, location_name: locationName, assigned_to: args.assigned_to || null, assigned_name: args.assigned_name || null };

  const missing: string[] = [];
  if (!draft.title) missing.push("title");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_work_order",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Work Order", summary: `"${draft.title}" (${draft.priority}) at ${locationName || "unspecified"}`,
    risk: "medium", affected: [draft.title, locationName].filter(Boolean), pending_action_id: pendingActionId, draft, missing_fields: missing, can_approve: missing.length === 0,
  }));

  return success({ type: "work_order_draft", draft, missing_fields: missing, pending_action_id: pendingActionId, requires_approval: true, message: missing.length > 0 ? `WO draft missing: ${missing.join(", ")}` : `Work order draft ready.` });
}

export async function executeWorkOrderCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "cmms", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { data: woData, error } = await sbService.from("cmms_work_orders").insert({
    company_id: companyId, title: draft.title, description: draft.description, priority: draft.priority,
    location_id: draft.location_id, status: "open", created_by: userId,
  }).select("id, title").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { wo_id: woData.id }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "cmms.create_work_order", actionType: "write", riskLevel: "medium", request: draft, result: { wo_id: woData.id }, entitiesAffected: [woData.id], module: "cmms" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Work Order Created", summary: `"${woData.title}" created.`, changes: [`WO "${woData.title}" created`] }));
  return success({ type: "work_order_created", wo_id: woData.id, message: `Work order "${woData.title}" created.` });
}

export async function updateWoStatusDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "cmms", ctx });
  if (!permCheck.ok) return permCheck;

  let wo: any = null;
  if (args.wo_id) {
    const { data } = await sb.from("cmms_work_orders").select("id, title, status, company_id").eq("id", args.wo_id).eq("company_id", companyId).maybeSingle();
    wo = data;
  } else if (args.wo_title) {
    const { data } = await sb.from("cmms_work_orders").select("id, title, status, company_id").eq("company_id", companyId).ilike("title", `%${args.wo_title}%`).limit(1);
    wo = data?.[0];
  }
  if (!wo) return capabilityError("Work order not found.");

  const draft = { wo_id: wo.id, wo_title: wo.title, old_status: wo.status, new_status: args.new_status, reason: args.reason };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_wo_status",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update WO Status: "${wo.title}"`, summary: `${wo.status} → ${args.new_status}`,
    risk: "medium", affected: [wo.title], pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "wo_status_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `WO status change draft ready.` });
}

export async function executeWoStatusUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "cmms", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const updateFields: any = { status: draft.new_status, updated_at: new Date().toISOString() };
  if (draft.new_status === "completed") updateFields.completed_at = new Date().toISOString();

  const { error } = await sbService.from("cmms_work_orders").update(updateFields).eq("id", draft.wo_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Update failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "cmms.update_wo_status", actionType: "write", riskLevel: "medium", request: draft, result: { wo_id: draft.wo_id }, entitiesAffected: [draft.wo_id], module: "cmms" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Work Order Updated", summary: `"${draft.wo_title}" → ${draft.new_status}`, changes: [`${draft.old_status} → ${draft.new_status}`] }));
  return success({ type: "wo_status_updated", wo_id: draft.wo_id, message: `WO "${draft.wo_title}" updated to "${draft.new_status}".` });
}

// ─── B6: Task Management ───

export async function createTaskDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;

  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (locationName && !locationId) {
    const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1);
    if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
  }

  const draft = { title: args.title, description: args.description || null, priority: args.priority || "medium", location_id: locationId, location_name: locationName, due_date: args.due_date || null, assigned_to: args.assigned_to || null, assigned_name: args.assigned_name || null };

  const missing: string[] = [];
  if (!draft.title) missing.push("title");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_task",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Task", summary: `"${draft.title}" at ${locationName || "unspecified"}${draft.due_date ? `, due ${draft.due_date}` : ""}`,
    risk: "medium", affected: [draft.title, locationName].filter(Boolean), pending_action_id: pendingActionId, draft, missing_fields: missing, can_approve: missing.length === 0,
  }));

  return success({ type: "task_draft", draft, missing_fields: missing, pending_action_id: pendingActionId, requires_approval: true, message: missing.length > 0 ? `Task draft missing: ${missing.join(", ")}` : `Task draft ready.` });
}

export async function executeTaskCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { data: taskData, error } = await sbService.from("tasks").insert({
    company_id: companyId, title: draft.title, description: draft.description, priority: draft.priority,
    status: "pending", created_by: userId, due_date: draft.due_date,
  }).select("id, title").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed: ${error.message}`);
  }

  // Assign to location if specified
  if (draft.location_id && taskData) {
    await sbService.from("task_locations").insert({ task_id: taskData.id, location_id: draft.location_id }).select("id").maybeSingle();
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { task_id: taskData.id }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "tasks.create", actionType: "write", riskLevel: "medium", request: draft, result: { task_id: taskData.id }, entitiesAffected: [taskData.id], module: "tasks" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Task Created", summary: `"${taskData.title}" created.`, changes: [`Task "${taskData.title}" created`] }));
  return success({ type: "task_created", task_id: taskData.id, message: `Task "${taskData.title}" created.` });
}

// ─── B7: Training Management ───

export async function createTrainingAssignmentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve employee
  let employeeId = args.employee_id || null;
  let employeeName = args.employee_name || null;
  if (employeeName && !employeeId) {
    const { data } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${employeeName}%`).limit(1);
    if (data?.[0]) { employeeId = data[0].id; employeeName = data[0].full_name; }
  }

  // Resolve training program
  let moduleId = args.module_id || null;
  let moduleName = args.module_name || null;
  if (moduleName && !moduleId) {
    const { data } = await sb.from("training_programs").select("id, name").eq("company_id", companyId).ilike("name", `%${moduleName}%`).limit(1);
    if (data?.[0]) { moduleId = data[0].id; moduleName = data[0].name; }
  }

  const draft = { employee_id: employeeId, employee_name: employeeName, module_id: moduleId, module_name: moduleName, start_date: args.start_date || new Date().toISOString().split("T")[0] };

  const missing: string[] = [];
  if (!employeeId) missing.push("employee");
  if (!moduleId) missing.push("training program");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_training_assignment",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Assign Training", summary: `Assign "${moduleName || "?"}" to ${employeeName || "?"}`,
    risk: "medium", affected: [employeeName, moduleName].filter(Boolean), pending_action_id: pendingActionId, draft, missing_fields: missing, can_approve: missing.length === 0,
  }));

  return success({ type: "training_assignment_draft", draft, missing_fields: missing, pending_action_id: pendingActionId, requires_approval: true, message: missing.length > 0 ? `Draft missing: ${missing.join(", ")}` : `Training assignment draft ready.` });
}

export async function executeTrainingAssignment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { data: taData, error } = await sbService.from("training_assignments").insert({
    company_id: companyId, trainee_employee_id: draft.employee_id, module_id: draft.module_id,
    status: "assigned", start_date: draft.start_date, assigned_by: userId,
  }).select("id").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { assignment_id: taData.id }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.assign_training", actionType: "write", riskLevel: "medium", request: draft, result: { assignment_id: taData.id }, entitiesAffected: [taData.id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Training Assigned", summary: `"${draft.module_name}" assigned to ${draft.employee_name}.`, changes: [`Training assigned`] }));
  return success({ type: "training_assigned", assignment_id: taData.id, message: `Training "${draft.module_name}" assigned to ${draft.employee_name}.` });
}

export async function updateTrainingStatusDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  let assignment: any = null;
  if (args.assignment_id) {
    const { data } = await sb.from("training_assignments").select("id, trainee_employee_id, employees!training_assignments_trainee_employee_id_fkey(full_name), module_id, training_programs(name), status, company_id").eq("id", args.assignment_id).maybeSingle();
    assignment = data;
  } else if (args.employee_name && args.module_name) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
    if (emps?.[0]) {
      const { data } = await sb.from("training_assignments").select("id, trainee_employee_id, employees!training_assignments_trainee_employee_id_fkey(full_name), module_id, training_programs(name), status, company_id")
        .eq("trainee_employee_id", emps[0].id).eq("company_id", companyId).in("status", ["assigned", "in_progress"]).limit(1);
      assignment = data?.[0];
    }
  }
  if (!assignment) return capabilityError("Training assignment not found.");
  if (assignment.company_id !== companyId) return capabilityError("Cross-tenant rejected.");

  const draft = { assignment_id: assignment.id, employee_name: assignment.employees?.full_name, module_name: assignment.training_programs?.name, old_status: assignment.status, new_status: args.new_status };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_training_status",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update Training: ${assignment.employees?.full_name}`, summary: `"${assignment.training_programs?.name}" → ${args.new_status}`,
    risk: "medium", affected: [assignment.employees?.full_name, assignment.training_programs?.name].filter(Boolean), pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "training_status_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `Training status change draft ready.` });
}

export async function executeTrainingStatusUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const updateFields: any = { status: draft.new_status, updated_at: new Date().toISOString() };
  if (draft.new_status === "completed") updateFields.completed_at = new Date().toISOString();

  const { error } = await sbService.from("training_assignments").update(updateFields).eq("id", draft.assignment_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Update failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "workforce.update_training_status", actionType: "write", riskLevel: "medium", request: draft, result: { assignment_id: draft.assignment_id }, entitiesAffected: [draft.assignment_id], module: "workforce" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Training Status Updated", summary: `${draft.employee_name}'s "${draft.module_name}" → ${draft.new_status}`, changes: [`${draft.old_status} → ${draft.new_status}`] }));
  return success({ type: "training_status_updated", assignment_id: draft.assignment_id, message: `Training status updated to "${draft.new_status}".` });
}

// ─── C1: Departments ───

export async function listDepartments(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("departments")
    .select("id, name, description, color")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) return capabilityError(error.message);
  const c = cap(data, args.limit || 100);
  if (c.items.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: "Departments",
      columns: ["Name", "Description", "Color"],
      rows: c.items.map((d: any) => [d.name, d.description ?? "—", d.color ?? "—"]),
      total: c.total, truncated: c.truncated,
    }));
  }
  return success({ count: c.total, departments: c.items });
}

export async function createDepartmentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.name) return capabilityError("Department name is required.");
  const draft = { name: args.name, description: args.description || null, color: args.color || null };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_department",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Department", summary: `Create department "${args.name}"`,
    risk: "low", affected: [args.name], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "department_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "low", message: `Department draft ready.` });
}

export async function executeCreateDepartment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { data, error } = await sbService.from("departments")
    .insert({ company_id: companyId, name: d.name, description: d.description, color: d.color })
    .select("id").single();
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { id: data.id } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "create_department", risk_level: "low", status: "success", approval_status: "approved", modules_touched: ["workforce"], result_json: { id: data.id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Department Created", summary: `Department "${d.name}" created.`, changes: [`Created: ${d.name}`] }));
  return success({ id: data.id });
}

export async function updateDepartmentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  let deptId = args.department_id || null;
  let deptName = args.name || null;
  if (!deptId && args.department_name) {
    const { data } = await sb.from("departments").select("id, name").eq("company_id", companyId).ilike("name", `%${args.department_name}%`).limit(1);
    if (data?.[0]) { deptId = data[0].id; deptName = args.name || data[0].name; }
  }
  if (!deptId) return capabilityError("Department not found.");
  const draft = { department_id: deptId, name: deptName, description: args.description, color: args.color };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_department",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Department", summary: `Update department "${deptName}"`,
    risk: "low", affected: [deptName].filter(Boolean), pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "update_department_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "low", message: `Update draft ready.` });
}

export async function executeUpdateDepartment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const updates: any = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.description !== undefined) updates.description = d.description;
  if (d.color !== undefined) updates.color = d.color;
  const { error } = await sbService.from("departments").update(updates).eq("id", d.department_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "update_department", risk_level: "low", status: "success", approval_status: "approved", modules_touched: ["workforce"], result_json: { id: d.department_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Department Updated", summary: `Department "${d.name}" updated.`, changes: [`Updated: ${d.name}`] }));
  return success({ id: d.department_id });
}

export async function deleteDepartmentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  let deptId = args.department_id || null;
  let deptName = args.department_name || null;
  if (!deptId && deptName) {
    const { data } = await sb.from("departments").select("id, name").eq("company_id", companyId).ilike("name", `%${deptName}%`).limit(1);
    if (data?.[0]) { deptId = data[0].id; deptName = data[0].name; }
  } else if (deptId) {
    const { data } = await sb.from("departments").select("id, name").eq("id", deptId).eq("company_id", companyId).maybeSingle();
    if (data) deptName = data.name;
  }
  if (!deptId) return capabilityError("Department not found.");
  // Count employees in department
  const { count: empCount } = await sb.from("employees").select("id", { count: "exact", head: true }).eq("department_id", deptId).eq("company_id", companyId);
  const draft = { department_id: deptId, department_name: deptName, employee_count: empCount || 0 };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_department",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Department", summary: `Delete department "${deptName}"${empCount ? ` — WARNING: ${empCount} employee(s) assigned` : ""}`,
    risk: "high", affected: [deptName].filter(Boolean), pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_department_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "high", message: `Delete draft ready. ${empCount ? `${empCount} employee(s) will be unassigned.` : ""}` });
}

export async function executeDeleteDepartment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("departments").delete().eq("id", d.department_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "delete_department", risk_level: "high", status: "success", approval_status: "approved", modules_touched: ["workforce"], result_json: { id: d.department_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Department Deleted", summary: `Department "${d.department_name}" deleted.`, changes: [`Deleted: ${d.department_name}`] }));
  return success({ id: d.department_id });
}

// ─── C2: Tasks Extended ───

export async function listTasks(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  let q = sb.from("tasks").select("id, title, status, priority, due_date, assigned_to, locations(name)")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true })
    .limit(args.limit || 50);
  if (args.status) q = q.eq("status", args.status);
  if (args.priority) q = q.eq("priority", args.priority);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, args.limit || 50);
  if (c.items.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: "Tasks",
      columns: ["Title", "Status", "Priority", "Due Date", "Location"],
      rows: c.items.map((t: any) => [t.title, t.status, t.priority ?? "—", t.due_date ?? "—", t.locations?.name ?? "—"]),
      total: c.total, truncated: c.truncated,
    }));
  }
  return success({ count: c.total, tasks: c.items });
}

export async function updateTaskDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.task_id) return capabilityError("task_id is required.");
  const { data: task } = await sb.from("tasks").select("id, title, status, priority, due_date, company_id").eq("id", args.task_id).maybeSingle();
  if (!task || task.company_id !== companyId) return capabilityError("Task not found.");
  const draft = { task_id: task.id, title: args.title ?? task.title, status: args.status ?? task.status, priority: args.priority ?? task.priority, due_date: args.due_date ?? task.due_date };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_task",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Task", summary: `Update task "${task.title}"`,
    risk: "medium", affected: [task.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "update_task_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "medium", message: `Task update draft ready.` });
}

export async function executeTaskUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("tasks").update({ title: d.title, status: d.status, priority: d.priority, due_date: d.due_date }).eq("id", d.task_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "update_task", risk_level: "medium", status: "success", approval_status: "approved", modules_touched: ["tasks"], result_json: { id: d.task_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Task Updated", summary: `Task "${d.title}" updated.`, changes: [`Status: ${d.status}`, `Priority: ${d.priority}`] }));
  return success({ id: d.task_id });
}

export async function deleteTaskDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.task_id) return capabilityError("task_id is required.");
  const { data: task } = await sb.from("tasks").select("id, title, company_id").eq("id", args.task_id).maybeSingle();
  if (!task || task.company_id !== companyId) return capabilityError("Task not found.");
  const draft = { task_id: task.id, title: task.title };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_task",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Task", summary: `Delete task "${task.title}"`,
    risk: "high", affected: [task.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_task_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "high", message: `Delete draft ready for task "${task.title}".` });
}

export async function executeTaskDeletion(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("tasks").delete().eq("id", d.task_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "delete_task", risk_level: "high", status: "success", approval_status: "approved", modules_touched: ["tasks"], result_json: { id: d.task_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Task Deleted", summary: `Task "${d.title}" deleted.`, changes: [`Deleted: ${d.title}`] }));
  return success({ id: d.task_id });
}

export async function completeTaskDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.task_id) return capabilityError("task_id is required.");
  const { data: task } = await sb.from("tasks").select("id, title, status, company_id").eq("id", args.task_id).maybeSingle();
  if (!task || task.company_id !== companyId) return capabilityError("Task not found.");
  if (task.status === "completed") return capabilityError("Task is already completed.");
  const draft = { task_id: task.id, title: task.title, completion_notes: args.notes || null };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "complete_task",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Complete Task", summary: `Mark task "${task.title}" as completed`,
    risk: "low", affected: [task.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "complete_task_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "low", message: `Complete draft ready for "${task.title}".` });
}

export async function executeTaskCompletion(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "tasks", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", d.task_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "complete_task", risk_level: "low", status: "success", approval_status: "approved", modules_touched: ["tasks"], result_json: { id: d.task_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Task Completed", summary: `Task "${d.title}" marked as completed.`, changes: [`Completed: ${d.title}`] }));
  return success({ id: d.task_id });
}

// ─── C3: Documents ───

export async function listDocuments(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  let q = sb.from("documents")
    .select("id, title, file_type, expiry_date, document_categories(name)")
    .eq("company_id", companyId)
    .order("title", { ascending: true })
    .limit(args.limit || 50);
  if (args.category_name) q = q.ilike("document_categories.name", `%${args.category_name}%`);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, args.limit || 50);
  if (c.items.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: "Documents",
      columns: ["Title", "Type", "Category", "Expires"],
      rows: c.items.map((d: any) => [d.title, d.file_type ?? "—", d.document_categories?.name ?? "—", d.expiry_date ?? "—"]),
      total: c.total, truncated: c.truncated,
    }));
  }
  return success({ count: c.total, documents: c.items });
}

export async function linkDocumentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.title || !args.file_url) return capabilityError("title and file_url are required.");
  const draft = { title: args.title, file_url: args.file_url, file_type: args.file_type || null, category_id: args.category_id || null, expiry_date: args.expiry_date || null, description: args.description || null };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "link_document",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Link Document", summary: `Link document "${args.title}"`,
    risk: "medium", affected: [args.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "link_document_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "medium", message: `Document link draft ready.` });
}

export async function executeDocumentLink(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { data, error } = await sbService.from("documents").insert({
    company_id: companyId, title: d.title, file_url: d.file_url, file_type: d.file_type,
    category_id: d.category_id, expiry_date: d.expiry_date, description: d.description, uploaded_by: userId,
  }).select("id").single();
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { id: data.id } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "link_document", risk_level: "medium", status: "success", approval_status: "approved", modules_touched: ["documents"], result_json: { id: data.id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Document Linked", summary: `Document "${d.title}" linked successfully.`, changes: [`Linked: ${d.title}`] }));
  return success({ id: data.id });
}

export async function createDocumentCategoryDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.name) return capabilityError("Category name is required.");
  const draft = { name: args.name, description: args.description || null };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_document_category",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Document Category", summary: `Create document category "${args.name}"`,
    risk: "low", affected: [args.name], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "create_document_category_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "low", message: `Category draft ready.` });
}

export async function executeDocumentCategoryCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { data, error } = await sbService.from("document_categories").insert({ company_id: companyId, name: d.name, description: d.description }).select("id").single();
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { id: data.id } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "create_document_category", risk_level: "low", status: "success", approval_status: "approved", modules_touched: ["documents"], result_json: { id: data.id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Document Category Created", summary: `Category "${d.name}" created.`, changes: [`Created: ${d.name}`] }));
  return success({ id: data.id });
}

export async function deleteDocumentDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.document_id) return capabilityError("document_id is required.");
  const { data: doc } = await sb.from("documents").select("id, title, company_id").eq("id", args.document_id).maybeSingle();
  if (!doc || doc.company_id !== companyId) return capabilityError("Document not found.");
  const draft = { document_id: doc.id, title: doc.title };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_document",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Document", summary: `Delete document "${doc.title}"`,
    risk: "high", affected: [doc.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_document_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "high", message: `Delete draft ready for "${doc.title}".` });
}

export async function executeDocumentDeletion(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "delete", module: "documents", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("documents").delete().eq("id", d.document_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "delete_document", risk_level: "high", status: "success", approval_status: "approved", modules_touched: ["documents"], result_json: { id: d.document_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Document Deleted", summary: `Document "${d.title}" deleted.`, changes: [`Deleted: ${d.title}`] }));
  return success({ id: d.document_id });
}

// ─── C4: Alerts ───

export async function listAlerts(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  let q = sb.from("alerts")
    .select("id, title, message, severity, category, resolved, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(args.limit || 50);
  if (args.severity) q = q.eq("severity", args.severity);
  if (args.category) q = q.eq("category", args.category);
  if (args.resolved !== undefined) q = q.eq("resolved", args.resolved);
  else q = q.eq("resolved", false); // Default: unresolved alerts
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, args.limit || 50);
  if (c.items.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: args.resolved ? "Resolved Alerts" : "Open Alerts",
      columns: ["Title", "Severity", "Category", "Date"],
      rows: c.items.map((a: any) => [a.title, a.severity, a.category, a.created_at?.slice(0, 10)]),
      total: c.total, truncated: c.truncated,
    }));
  }
  return success({ count: c.total, alerts: c.items });
}

export async function resolveAlertDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.alert_id) return capabilityError("alert_id is required.");
  const { data: alert } = await sb.from("alerts").select("id, title, severity, company_id, resolved").eq("id", args.alert_id).maybeSingle();
  if (!alert || alert.company_id !== companyId) return capabilityError("Alert not found.");
  if (alert.resolved) return capabilityError("Alert is already resolved.");
  const draft = { alert_id: alert.id, title: alert.title, severity: alert.severity, resolution_note: args.resolution_note || null };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "resolve_alert",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Resolve Alert", summary: `Resolve alert "${alert.title}"${args.resolution_note ? ` — ${args.resolution_note}` : ""}`,
    risk: "medium", affected: [alert.title], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "resolve_alert_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "medium", message: `Resolve draft ready for "${alert.title}".` });
}

export async function executeAlertResolution(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { error } = await sbService.from("alerts").update({ resolved: true, resolved_by: userId, resolved_at: new Date().toISOString() }).eq("id", d.alert_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { success: true } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "resolve_alert", risk_level: "medium", status: "success", approval_status: "approved", modules_touched: ["workforce"], result_json: { id: d.alert_id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Alert Resolved", summary: `Alert "${d.title}" has been resolved.`, changes: [`Resolved: ${d.title}`] }));
  return success({ id: d.alert_id });
}

// ─── C5: Training Programs ───

export async function listTrainingPrograms(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("training_programs")
    .select("id, name, description, duration_hours, is_mandatory")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(args.limit || 50);
  if (error) return capabilityError(error.message);
  const c = cap(data, args.limit || 50);
  if (c.items.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: "Training Programs",
      columns: ["Name", "Duration (hrs)", "Mandatory", "Description"],
      rows: c.items.map((p: any) => [p.name, p.duration_hours ?? "—", p.is_mandatory ? "Yes" : "No", p.description ?? "—"]),
      total: c.total, truncated: c.truncated,
    }));
  }
  return success({ count: c.total, programs: c.items });
}

export async function createTrainingProgramDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "testing_training", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.name) return capabilityError("Program name is required.");
  const draft = { name: args.name, description: args.description || null, duration_hours: args.duration_hours || null, is_mandatory: args.is_mandatory ?? false };
  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_training_program",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Training Program", summary: `Create training program "${args.name}"${args.duration_hours ? ` (${args.duration_hours}h)` : ""}`,
    risk: "medium", affected: [args.name], pending_action_id: paData?.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "create_training_program_draft", draft, pending_action_id: paData?.id, requires_approval: true, risk_level: "medium", message: `Training program draft ready.` });
}

export async function executeTrainingProgramCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "testing_training", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");
  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status").eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");
  const d = pa.preview_json;
  const { data, error } = await sbService.from("training_programs").insert({
    company_id: companyId, name: d.name, description: d.description, duration_hours: d.duration_hours, is_mandatory: d.is_mandatory, created_by: userId,
  }).select("id").single();
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }
  await sbService.from("dash_pending_actions").update({ status: "executed", approved_by: userId, approved_at: new Date().toISOString(), execution_result: { id: data.id } }).eq("id", args.pending_action_id);
  await logCapabilityAction(sbService, { company_id: companyId, user_id: userId, action_type: "write", action_name: "create_training_program", risk_level: "medium", status: "success", approval_status: "approved", modules_touched: ["testing_training"], result_json: { id: data.id } });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Training Program Created", summary: `Training program "${d.name}" created.`, changes: [`Created: ${d.name}`] }));
  return success({ id: data.id });
}
