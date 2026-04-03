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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_employee",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  const changeSummary = Object.entries(changes).map(([k, v]) => `${k}: ${v.old} → ${v.new}`).join(", ");
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update Employee: ${emp.full_name}`,
    summary: changeSummary,
    risk: "medium", affected: [emp.full_name], pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "employee_update_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `Employee update draft ready. Changes: ${changeSummary}` });
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "deactivate_employee",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Deactivate Employee: ${emp.full_name}`,
    summary: `Set "${emp.full_name}" (${emp.role} at ${emp.locations?.name}) to inactive.${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "high", affected: [emp.full_name, emp.locations?.name].filter(Boolean),
    pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "employee_deactivate_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `Deactivation draft for "${emp.full_name}" ready. Approve to proceed.` });
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "correct_attendance",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Correct Attendance: ${log.employees?.full_name}`,
    summary: changes.join("; ") + (args.reason ? `. Reason: ${args.reason}` : ""),
    risk: "medium", affected: [log.employees?.full_name], pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "attendance_correction_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `Attendance correction draft ready.` });
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "excuse_late_arrival",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Excuse Late Arrival: ${log.employees?.full_name}`,
    summary: `Mark ${log.late_minutes}min late arrival as excused.${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "medium", affected: [log.employees?.full_name], pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "excuse_late_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `Excuse draft ready.` });
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
    const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_work_order",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    if (paError || !paData?.id) {
      console.error("[Dash] pending action insert failed:", paError?.message);
      return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
    }
    pendingActionId = paData.id;
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_wo_status",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update WO Status: "${wo.title}"`, summary: `${wo.status} → ${args.new_status}`,
    risk: "medium", affected: [wo.title], pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "wo_status_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `WO status change draft ready.` });
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
    const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_task",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    if (paError || !paData?.id) {
      console.error("[Dash] pending action insert failed:", paError?.message);
      return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
    }
    pendingActionId = paData.id;
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

  // Optionally resolve trainer
  let trainerId = args.trainer_employee_id || null;
  let trainerName = args.trainer_employee_name || null;
  if (!trainerId && trainerName) {
    const { data: trData } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${trainerName}%`).limit(1);
    if (trData?.[0]) { trainerId = trData[0].id; trainerName = trData[0].full_name; }
  }

  const draft = {
    employee_id: employeeId, employee_name: employeeName,
    module_id: moduleId, module_name: moduleName,
    start_date: args.start_date || new Date().toISOString().split("T")[0],
    trainer_employee_id: trainerId || null,
    trainer_name: trainerName || null,
    experience_level: args.experience_level || null,
  };

  const missing: string[] = [];
  if (!employeeId) missing.push("employee");
  if (!moduleId) missing.push("training program");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_training_assignment",
      action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    if (paError || !paData?.id) {
      console.error("[Dash] pending action insert failed:", paError?.message);
      return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
    }
    pendingActionId = paData.id;
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
    trainer_employee_id: draft.trainer_employee_id || null,
    experience_level: draft.experience_level || null,
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_training_status",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update Training: ${assignment.employees?.full_name}`, summary: `"${assignment.training_programs?.name}" → ${args.new_status}`,
    risk: "medium", affected: [assignment.employees?.full_name, assignment.training_programs?.name].filter(Boolean), pending_action_id: paData.id, draft, can_approve: true,
  }));

  return success({ type: "training_status_draft", draft, pending_action_id: paData.id, requires_approval: true, message: `Training status change draft ready.` });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_department",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Department", summary: `Create department "${args.name}"`,
    risk: "low", affected: [args.name], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "department_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "low", message: `Department draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "create_department", actionType: "write", riskLevel: "low", module: "workforce", request: d, result: { id: data.id }, entitiesAffected: [data.id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_department",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Department", summary: `Update department "${deptName}"`,
    risk: "low", affected: [deptName].filter(Boolean), pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "update_department_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "low", message: `Update draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "update_department", actionType: "write", riskLevel: "low", module: "workforce", request: d, result: { id: d.department_id }, entitiesAffected: [d.department_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_department",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Department", summary: `Delete department "${deptName}"${empCount ? ` — WARNING: ${empCount} employee(s) assigned` : ""}`,
    risk: "high", affected: [deptName].filter(Boolean), pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_department_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "high", message: `Delete draft ready. ${empCount ? `${empCount} employee(s) will be unassigned.` : ""}` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "delete_department", actionType: "write", riskLevel: "high", module: "workforce", request: d, result: { id: d.department_id }, entitiesAffected: [d.department_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_task",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Task", summary: `Update task "${task.title}"`,
    risk: "medium", affected: [task.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "update_task_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "medium", message: `Task update draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "update_task", actionType: "write", riskLevel: "medium", module: "tasks", request: d, result: { id: d.task_id }, entitiesAffected: [d.task_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_task",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Task", summary: `Delete task "${task.title}"`,
    risk: "high", affected: [task.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_task_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "high", message: `Delete draft ready for task "${task.title}".` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "delete_task", actionType: "write", riskLevel: "high", module: "tasks", request: d, result: { id: d.task_id }, entitiesAffected: [d.task_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "complete_task",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Complete Task", summary: `Mark task "${task.title}" as completed`,
    risk: "low", affected: [task.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "complete_task_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "low", message: `Complete draft ready for "${task.title}".` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "complete_task", actionType: "write", riskLevel: "low", module: "tasks", request: d, result: { id: d.task_id }, entitiesAffected: [d.task_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "link_document",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Link Document", summary: `Link document "${args.title}"`,
    risk: "medium", affected: [args.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "link_document_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "medium", message: `Document link draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "link_document", actionType: "write", riskLevel: "medium", module: "documents", request: d, result: { id: data.id }, entitiesAffected: [data.id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_document_category",
    action_type: "write", risk_level: "low", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Document Category", summary: `Create document category "${args.name}"`,
    risk: "low", affected: [args.name], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "create_document_category_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "low", message: `Category draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "create_document_category", actionType: "write", riskLevel: "low", module: "documents", request: d, result: { id: data.id }, entitiesAffected: [data.id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_document",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Document", summary: `Delete document "${doc.title}"`,
    risk: "high", affected: [doc.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "delete_document_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "high", message: `Delete draft ready for "${doc.title}".` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "delete_document", actionType: "write", riskLevel: "high", module: "documents", request: d, result: { id: d.document_id }, entitiesAffected: [d.document_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "resolve_alert",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Resolve Alert", summary: `Resolve alert "${alert.title}"${args.resolution_note ? ` — ${args.resolution_note}` : ""}`,
    risk: "medium", affected: [alert.title], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "resolve_alert_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "medium", message: `Resolve draft ready for "${alert.title}".` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "resolve_alert", actionType: "write", riskLevel: "medium", module: "workforce", request: d, result: { id: d.alert_id }, entitiesAffected: [d.alert_id] });
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
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_training_program",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) {
    console.error("[Dash] pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
  }
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Training Program", summary: `Create training program "${args.name}"${args.duration_hours ? ` (${args.duration_hours}h)` : ""}`,
    risk: "medium", affected: [args.name], pending_action_id: paData.id, draft, missing_fields: [], can_approve: true,
  }));
  return success({ type: "create_training_program_draft", draft, pending_action_id: paData.id, requires_approval: true, risk_level: "medium", message: `Training program draft ready.` });
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
  await logCapabilityAction(sbService, { companyId, userId, capability: "create_training_program", actionType: "write", riskLevel: "medium", module: "testing_training", request: d, result: { id: data.id }, entitiesAffected: [data.id] });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Training Program Created", summary: `Training program "${d.name}" created.`, changes: [`Created: ${d.name}`] }));
  return success({ id: data.id });
}

// ─── CMMS Assets ───

export async function listAssets(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) locationId = loc.id;
  }

  let q = sb.from("cmms_assets")
    .select("id, name, category, status, criticality, location_id, locations(name), serial_number, last_maintenance_date, next_maintenance_date")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.status) q = q.eq("status", args.status);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    assets: (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      status: a.status,
      criticality: a.criticality,
      location: a.locations?.name,
      serial_number: a.serial_number,
      last_maintenance_date: a.last_maintenance_date,
      next_maintenance_date: a.next_maintenance_date,
    })),
  });
}

export async function getAssetDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let q = sb.from("cmms_assets")
    .select("id, name, category, status, criticality, location_id, locations(name), serial_number, description, purchase_date, warranty_expiry, last_maintenance_date, next_maintenance_date")
    .eq("company_id", companyId);

  if (args.asset_id) {
    q = q.eq("id", args.asset_id);
  } else if (args.asset_name) {
    q = q.ilike("name", `%${args.asset_name}%`).limit(3);
  } else {
    return capabilityError("Provide asset_name or asset_id.");
  }

  const { data: assetData } = await q.limit(3);
  if (!assetData?.length) return capabilityError("Asset not found.");
  if (assetData.length > 1) return capabilityError(`Multiple assets match: ${assetData.map((a: any) => a.name).join(", ")}.`);
  const asset = assetData[0];

  // Get recent work orders for this asset
  const { data: wos } = await sb.from("cmms_work_orders")
    .select("id, title, status, priority, created_at, completed_at")
    .eq("asset_id", asset.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return success({
    asset: {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      criticality: asset.criticality,
      location: asset.locations?.name,
      serial_number: asset.serial_number,
      description: asset.description,
      purchase_date: asset.purchase_date,
      warranty_expiry: asset.warranty_expiry,
      last_maintenance_date: asset.last_maintenance_date,
      next_maintenance_date: asset.next_maintenance_date,
    },
    recent_work_orders: (wos || []).map((wo: any) => ({
      title: wo.title, status: wo.status, priority: wo.priority, created_at: wo.created_at,
    })),
  });
}

// ─── Labor Costs ───

export async function getLaborCosts(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id;
  }

  let q = sb.from("labor_costs")
    .select("id, location_id, locations(name), period_start, period_end, total_hours, total_cost, regular_hours, overtime_hours, created_at")
    .eq("company_id", companyId)
    .order("period_start", { ascending: false })
    .limit(50);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.from) q = q.gte("period_start", args.from);
  if (args.to) q = q.lte("period_end", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const totals = (data || []).reduce((acc: any, r: any) => {
    acc.total_hours = (acc.total_hours || 0) + (r.total_hours || 0);
    acc.total_cost = (acc.total_cost || 0) + (r.total_cost || 0);
    return acc;
  }, {});

  return success({
    summary: { total_hours: totals.total_hours || 0, total_cost: totals.total_cost || 0, period_count: data?.length ?? 0 },
    records: (data || []).map((r: any) => ({
      location: r.locations?.name,
      period_start: r.period_start,
      period_end: r.period_end,
      total_hours: r.total_hours,
      total_cost: r.total_cost,
      regular_hours: r.regular_hours,
      overtime_hours: r.overtime_hours,
    })),
  });
}

// ─── Training Sessions ───

export async function listTrainingSessions(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 20, 100);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) locationId = loc.id;
  }

  let programId: string | null = null;
  if (args.program_name) {
    const { data: prog } = await sb.from("training_programs").select("id").eq("company_id", companyId).ilike("name", `%${args.program_name}%`).limit(1).maybeSingle();
    if (prog) programId = prog.id;
  }

  let q = sb.from("training_sessions")
    .select("id, session_date, start_time, end_time, status, max_attendees, notes, location_id, locations(name), training_program_id, training_programs(name), trainer_id, employees(full_name)")
    .eq("company_id", companyId)
    .order("session_date", { ascending: false })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (programId) q = q.eq("training_program_id", programId);
  if (args.from) q = q.gte("session_date", args.from);
  if (args.to) q = q.lte("session_date", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    sessions: (data || []).map((s: any) => ({
      id: s.id,
      program: s.training_programs?.name,
      date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      location: s.locations?.name,
      trainer: s.employees?.full_name,
      status: s.status,
      max_attendees: s.max_attendees,
    })),
  });
}

export async function createTrainingSessionDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve program
  let programId = args.program_id || null;
  let programName = args.program_name || null;
  if (!programId && programName) {
    const { data: progs } = await sb.from("training_programs").select("id, name").eq("company_id", companyId).ilike("name", `%${programName}%`).limit(5);
    if (!progs?.length) return capabilityError(`No training program matching "${programName}".`);
    if (progs.length > 1) return capabilityError(`Multiple programs match "${programName}": ${progs.map((p: any) => p.name).join(", ")}.`);
    programId = progs[0].id; programName = progs[0].name;
  }

  // Resolve location
  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (!locationId && locationName) {
    const { data: loc } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${locationName}".`);
    locationId = loc.id; locationName = loc.name;
  }

  // Resolve trainer
  let trainerId: string | null = null;
  if (args.trainer_name) {
    const { data: trainer } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${args.trainer_name}%`).limit(1).maybeSingle();
    if (trainer) trainerId = trainer.id;
  }

  const draft = {
    training_program_id: programId,
    program_name: programName,
    location_id: locationId,
    location_name: locationName,
    session_date: args.session_date,
    start_time: args.start_time,
    end_time: args.end_time,
    trainer_id: trainerId,
    max_attendees: args.max_attendees || null,
  };

  const missing: string[] = [];
  if (!draft.session_date) missing.push("session_date");
  if (!draft.start_time) missing.push("start_time");
  if (!draft.end_time) missing.push("end_time");

  if (missing.length > 0) return capabilityError(`Missing required fields: ${missing.join(", ")}.`);

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_training_session",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Schedule Training Session",
    summary: `${programName || "Training"} session on ${draft.session_date} ${draft.start_time}-${draft.end_time}${locationName ? ` at ${locationName}` : ""}`,
    risk: "medium",
    affected: [programName, locationName, draft.session_date].filter(Boolean),
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "training_session_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeTrainingSessionCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const { data: sessData, error: sessError } = await sbService.from("training_sessions").insert({
    company_id: companyId,
    training_program_id: d.training_program_id || null,
    location_id: d.location_id || null,
    session_date: d.session_date,
    start_time: d.start_time,
    end_time: d.end_time,
    trainer_id: d.trainer_id || null,
    max_attendees: d.max_attendees || null,
    status: "scheduled",
    created_by: userId,
  }).select("id").single();

  if (sessError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: sessError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create training session: ${sessError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, session_id: sessData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Training Session Scheduled",
    summary: `${d.program_name || "Training"} session scheduled for ${d.session_date} ${d.start_time}-${d.end_time}.`,
  }));

  return success({ type: "training_session_created", session_id: sessData.id });
}

// ─── Payroll ───

export async function listPayrollPeriods(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 20, 100);
  let q = sb.from("payroll_periods")
    .select("id, name, period_start, period_end, status, total_gross, total_net, employee_count, approved_at, paid_at, created_at")
    .eq("company_id", companyId)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.from) q = q.gte("period_start", args.from);
  if (args.to) q = q.lte("period_end", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    periods: (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      period_start: p.period_start,
      period_end: p.period_end,
      status: p.status,
      total_gross: p.total_gross,
      total_net: p.total_net,
      employee_count: p.employee_count,
      approved_at: p.approved_at,
      paid_at: p.paid_at,
    })),
  });
}

export async function getPayrollSummary(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Resolve payroll period
  let periodId = args.period_id || null;
  if (!periodId && args.period_name) {
    const { data: per } = await sb.from("payroll_periods")
      .select("id, name, period_start, period_end, status")
      .eq("company_id", companyId)
      .ilike("name", `%${args.period_name}%`)
      .order("period_start", { ascending: false })
      .limit(1).maybeSingle();
    if (!per) return capabilityError(`No payroll period matching "${args.period_name}".`);
    periodId = per.id;
  }

  if (!periodId) {
    // Default: most recent period
    const { data: latest } = await sb.from("payroll_periods")
      .select("id, name, period_start, period_end, status, total_gross, total_net, employee_count")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false })
      .limit(1).maybeSingle();
    if (!latest) return capabilityError("No payroll periods found.");
    periodId = latest.id;
  }

  const { data: period } = await sb.from("payroll_periods")
    .select("id, name, period_start, period_end, status, total_gross, total_net, employee_count, approved_at, paid_at")
    .eq("id", periodId).maybeSingle();
  if (!period) return capabilityError("Payroll period not found.");

  // Get items
  const { data: items, error } = await sb.from("payroll_items")
    .select("id, employee_id, employees(full_name), gross_pay, net_pay, hours_worked, overtime_hours, status, location_id, locations(name)")
    .eq("payroll_period_id", periodId)
    .order("gross_pay", { ascending: false })
    .limit(200);

  if (error) return capabilityError(error.message);

  const entries = items || [];

  // By location
  const byLocation: Record<string, any> = {};
  for (const item of entries) {
    const loc = item.locations?.name || "Unknown";
    if (!byLocation[loc]) byLocation[loc] = { location: loc, employee_count: 0, total_gross: 0, total_net: 0 };
    byLocation[loc].employee_count++;
    byLocation[loc].total_gross += item.gross_pay || 0;
    byLocation[loc].total_net += item.net_pay || 0;
  }

  return success({
    period: {
      id: period.id,
      name: period.name,
      period_start: period.period_start,
      period_end: period.period_end,
      status: period.status,
      total_gross: period.total_gross,
      total_net: period.total_net,
      employee_count: period.employee_count,
      approved_at: period.approved_at,
      paid_at: period.paid_at,
    },
    by_location: Object.values(byLocation).sort((a: any, b: any) => b.total_gross - a.total_gross),
    top_earners: entries.slice(0, 10).map((i: any) => ({
      employee: i.employees?.full_name,
      location: i.locations?.name,
      gross_pay: i.gross_pay,
      net_pay: i.net_pay,
      hours_worked: i.hours_worked,
      overtime_hours: i.overtime_hours,
      status: i.status,
    })),
    total_items: entries.length,
  });
}

// ─── Payroll Writes ───

export async function createPayrollPeriodDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  const missing: string[] = [];
  if (!args.name) missing.push("name (e.g. 'March 2026')");
  if (!args.period_start) missing.push("period_start (YYYY-MM-DD)");
  if (!args.period_end) missing.push("period_end (YYYY-MM-DD)");
  if (missing.length > 0) return capabilityError(`Missing required fields: ${missing.join(", ")}.`);

  const draft = {
    name: args.name,
    period_start: args.period_start,
    period_end: args.period_end,
    notes: args.notes || null,
  };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_payroll_period",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Payroll Period",
    summary: `Create payroll period "${draft.name}" (${draft.period_start} → ${draft.period_end})`,
    risk: "high",
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "payroll_period_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeCreatePayrollPeriod(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const { data: periodData, error: periodError } = await sbService.from("payroll_periods").insert({
    company_id: companyId,
    name: d.name,
    period_start: d.period_start,
    period_end: d.period_end,
    status: "draft",
    notes: d.notes || null,
    created_by: userId,
  }).select("id, name").single();

  if (periodError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: periodError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create payroll period: ${periodError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, period_id: periodData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Payroll Period Created",
    summary: `Payroll period "${periodData.name}" created in draft status.`,
  }));

  return success({ type: "payroll_period_created", period_id: periodData.id, name: periodData.name });
}

export async function addPayrollItemDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve payroll period
  let periodId = args.period_id || null;
  let periodName: string | null = null;
  if (!periodId && args.period_name) {
    const { data: per } = await sb.from("payroll_periods")
      .select("id, name, status").eq("company_id", companyId).ilike("name", `%${args.period_name}%`).limit(1).maybeSingle();
    if (!per) return capabilityError(`No payroll period matching "${args.period_name}".`);
    if (!["draft", "calculated"].includes(per.status)) return capabilityError(`Payroll period "${per.name}" is ${per.status}. Can only add items to draft or calculated periods.`);
    periodId = per.id; periodName = per.name;
  }
  if (!periodId) return capabilityError("period_id or period_name is required.");

  // Resolve employee
  let empId = args.employee_id || null;
  let empName = args.employee_name || null;
  if (!empId && empName) {
    const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${empName}%`).limit(5);
    if (!emps?.length) return capabilityError(`Employee "${empName}" not found.`);
    if (emps.length > 1) return capabilityError(`Multiple employees match "${empName}": ${emps.map((e: any) => e.full_name).join(", ")}.`);
    empId = emps[0].id; empName = emps[0].full_name;
  }
  if (!empId) return capabilityError("employee_id or employee_name is required.");

  const VALID_ITEM_TYPES = ["base", "overtime", "bonus", "penalty", "tips", "deduction", "adjustment"];
  const itemType = VALID_ITEM_TYPES.includes(args.item_type) ? args.item_type : "adjustment";
  const amount = Number(args.amount);
  if (isNaN(amount)) return capabilityError("amount must be a number.");

  const draft = {
    period_id: periodId,
    period_name: periodName,
    employee_id: empId,
    employee_name: empName,
    item_type: itemType,
    amount,
    description: args.description || itemType,
  };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "add_payroll_item",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Add Payroll Item",
    summary: `Add ${itemType} of ${amount} for ${empName} to period "${periodName}"`,
    risk: "medium",
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "payroll_item_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeAddPayrollItem(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const { data: itemData, error: itemError } = await sbService.from("payroll_items").insert({
    payroll_period_id: d.period_id,
    employee_id: d.employee_id,
    item_type: d.item_type,
    amount: d.amount,
    description: d.description,
    created_by: userId,
  }).select("id").single();

  if (itemError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: itemError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to add payroll item: ${itemError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, item_id: itemData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Payroll Item Added",
    summary: `${d.item_type} of ${d.amount} added for ${d.employee_name}.`,
  }));

  return success({ type: "payroll_item_added", item_id: itemData.id });
}

export async function updatePayrollPeriodStatusDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve period
  let periodId = args.period_id || null;
  let periodName: string | null = null;
  if (!periodId && args.period_name) {
    const { data: per } = await sb.from("payroll_periods")
      .select("id, name, status").eq("company_id", companyId).ilike("name", `%${args.period_name}%`).limit(1).maybeSingle();
    if (!per) return capabilityError(`No payroll period matching "${args.period_name}".`);
    periodId = per.id; periodName = per.name;
  } else if (periodId) {
    const { data: per } = await sb.from("payroll_periods").select("id, name, status, company_id").eq("id", periodId).maybeSingle();
    if (!per || per.company_id !== companyId) return capabilityError("Payroll period not found.");
    periodName = per.name;
  }
  if (!periodId) return capabilityError("period_id or period_name is required.");

  const VALID_STATUSES = ["calculated", "approved", "paid", "closed"];
  const newStatus = args.new_status;
  if (!VALID_STATUSES.includes(newStatus)) return capabilityError(`new_status must be one of: ${VALID_STATUSES.join(", ")}.`);

  const draft = { period_id: periodId, period_name: periodName, new_status: newStatus, notes: args.notes || null };

  const riskLevel = newStatus === "paid" ? "high" : "medium";
  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_payroll_status",
    action_type: "write", risk_level: riskLevel, preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Payroll Status",
    summary: `Change payroll period "${periodName}" status to "${newStatus}"`,
    risk: riskLevel,
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "payroll_status_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeUpdatePayrollPeriodStatus(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "payroll", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const updateFields: Record<string, any> = {
    status: d.new_status,
    updated_at: new Date().toISOString(),
  };
  if (d.new_status === "approved") { updateFields.approved_at = new Date().toISOString(); updateFields.approved_by = userId; }
  if (d.new_status === "paid") { updateFields.paid_at = new Date().toISOString(); updateFields.paid_by = userId; }

  const { error: updateError } = await sbService.from("payroll_periods").update(updateFields).eq("id", d.period_id).eq("company_id", companyId);

  if (updateError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to update payroll status: ${updateError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Payroll Status Updated",
    summary: `Payroll period "${d.period_name}" is now "${d.new_status}".`,
  }));

  return success({ type: "payroll_status_updated", period_id: d.period_id, new_status: d.new_status });
}

// ─── Employee Performance ───

export async function getEmployeePerformanceReport(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id;
  }

  let employeeId: string | null = null;
  if (args.employee_name) {
    const { data: emp } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1).maybeSingle();
    if (!emp) return capabilityError(`No employee matching "${args.employee_name}".`);
    employeeId = emp.id;
  }

  let q = sb.from("performance_monthly_scores")
    .select("id, employee_id, employees(full_name, location_id, locations(name)), month, effective_score, attendance_score, punctuality_score, task_score, test_score, warning_penalty, rank_in_location")
    .eq("company_id", companyId)
    .order("month", { ascending: false })
    .limit(100);

  if (employeeId) q = q.eq("employee_id", employeeId);
  if (locationId) q = q.eq("location_id", locationId);
  if (args.month) q = q.eq("month", args.month); // YYYY-MM

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const records = data || [];

  return success({
    total: records.length,
    records: records.map((r: any) => ({
      employee: r.employees?.full_name,
      location: r.employees?.locations?.name,
      month: r.month,
      effective_score: r.effective_score,
      attendance_score: r.attendance_score,
      punctuality_score: r.punctuality_score,
      task_score: r.task_score,
      test_score: r.test_score,
      warning_penalty: r.warning_penalty,
      rank_in_location: r.rank_in_location,
    })),
  });
}

// ─── CMMS PM Plans ───

export async function listPmPlans(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("cmms_pm_plans")
    .select("id, name, scope_type, asset_id, cmms_assets(name), location_id, locations(name), frequency_type, frequency_value, next_due_at, auto_create_work_order, is_active, procedure_id, cmms_procedures(name)")
    .eq("company_id", companyId)
    .order("next_due_at", { ascending: true })
    .limit(limit);

  if (args.is_active !== undefined) q = q.eq("is_active", args.is_active);
  else q = q.eq("is_active", true);
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) q = q.eq("location_id", loc.id);
  }
  if (args.overdue_only) q = q.lte("next_due_at", new Date().toISOString());

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const today = new Date().toISOString();
  return success({
    total: data?.length ?? 0,
    plans: (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      scope_type: p.scope_type,
      asset: p.cmms_assets?.name,
      location: p.locations?.name,
      frequency: `every ${p.frequency_value} ${p.frequency_type}`,
      next_due_at: p.next_due_at,
      overdue: p.next_due_at ? p.next_due_at < today : false,
      auto_create_work_order: p.auto_create_work_order,
      procedure: p.cmms_procedures?.name,
    })),
  });
}

export async function getPmComplianceReport(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const from = args.from || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = args.to || new Date().toISOString().split("T")[0];

  const { data: runs, error } = await sb.from("cmms_pm_runs")
    .select("id, pm_plan_id, cmms_pm_plans(name, location_id, locations(name)), run_at, status, generated_work_order_id")
    .eq("company_id", companyId)
    .gte("run_at", from)
    .lte("run_at", to + "T23:59:59Z")
    .order("run_at", { ascending: false })
    .limit(500);

  if (error) return capabilityError(error.message);

  const all = runs || [];
  const completed = all.filter((r: any) => r.status === "completed");
  const missed = all.filter((r: any) => r.status === "missed" || r.status === "skipped");

  const complianceRate = all.length > 0
    ? Math.round((completed.length / all.length) * 100) : null;

  return success({
    period: { from, to },
    total_runs: all.length,
    completed: completed.length,
    missed: missed.length,
    compliance_rate_pct: complianceRate,
    runs: all.slice(0, 50).map((r: any) => ({
      plan: r.cmms_pm_plans?.name,
      location: r.cmms_pm_plans?.locations?.name,
      run_at: r.run_at,
      status: r.status,
      work_order_id: r.generated_work_order_id,
    })),
  });
}

export async function createPmPlanDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "cmms", ctx });
  if (!permCheck.ok) return permCheck;

  if (!args.name) return capabilityError("name is required.");
  if (!args.frequency_type) return capabilityError("frequency_type is required (daily/weekly/monthly/quarterly/yearly/cycles).");
  if (!args.frequency_value) return capabilityError("frequency_value is required (number).");

  const VALID_FREQ = ["daily", "weekly", "monthly", "quarterly", "yearly", "cycles"];
  if (!VALID_FREQ.includes(args.frequency_type)) return capabilityError(`frequency_type must be one of: ${VALID_FREQ.join(", ")}`);

  let assetId: string | null = null;
  let assetName: string | null = null;
  if (args.asset_name) {
    const { data: asset } = await sb.from("cmms_assets").select("id, name")
      .eq("company_id", companyId).ilike("name", `%${args.asset_name}%`).limit(1).maybeSingle();
    if (!asset) return capabilityError(`No CMMS asset matching "${args.asset_name}".`);
    assetId = asset.id; assetName = asset.name;
  }

  let locationId: string | null = null;
  let locationName: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id, name")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id; locationName = loc.name;
  }

  const draft = {
    name: args.name,
    scope_type: assetId ? "asset" : "location",
    asset_id: assetId,
    asset_name: assetName,
    location_id: locationId,
    location_name: locationName,
    frequency_type: args.frequency_type,
    frequency_value: args.frequency_value,
    auto_create_work_order: args.auto_create_work_order ?? true,
    next_due_at: args.next_due_at || null,
    is_active: true,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "create_pm_plan", risk_level: "medium",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id, action_name: "create_pm_plan", risk_level: "medium",
    title: "Create PM Plan",
    summary: `Create PM plan **"${args.name}"** — every ${args.frequency_value} ${args.frequency_type}${assetName ? ` for asset "${assetName}"` : locationName ? ` at ${locationName}` : ""}.`,
    fields: [
      { label: "Name", value: args.name },
      { label: "Frequency", value: `Every ${args.frequency_value} ${args.frequency_type}` },
      ...(assetName ? [{ label: "Asset", value: assetName }] : []),
      ...(locationName ? [{ label: "Location", value: locationName }] : []),
      { label: "Auto-create WO", value: String(draft.auto_create_work_order) },
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeCreatePmPlan(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "cmms");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: plan, error: planError } = await sbService.from("cmms_pm_plans").insert({
    company_id: companyId,
    name: d.name,
    scope_type: d.scope_type,
    asset_id: d.asset_id || null,
    location_id: d.location_id || null,
    frequency_type: d.frequency_type,
    frequency_value: d.frequency_value,
    auto_create_work_order: d.auto_create_work_order ?? true,
    next_due_at: d.next_due_at || null,
    is_active: true,
    created_by: userId,
  }).select("id").single();

  if (planError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: planError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create PM plan: ${planError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, plan_id: plan.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "PM Plan Created",
    summary: `Preventive maintenance plan "${d.name}" created. Runs every ${d.frequency_value} ${d.frequency_type}.`,
  }));

  return success({ type: "pm_plan_created", plan_id: plan.id });
}

// ─── CMMS Parts & Vendors ───

export async function listCmmsParts(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("cmms_parts")
    .select("id, name, part_number, category, unit_cost, unit_of_measure, is_active")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (args.is_active !== undefined) q = q.eq("is_active", args.is_active);
  else q = q.eq("is_active", true);
  if (args.category) q = q.ilike("category", `%${args.category}%`);
  if (args.name) q = q.ilike("name", `%${args.name}%`);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    parts: (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      part_number: p.part_number,
      category: p.category,
      unit_cost: p.unit_cost,
      unit_of_measure: p.unit_of_measure,
    })),
  });
}

export async function getPartsStockReport(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Get parts with stock levels
  const { data: stock, error } = await sb.from("cmms_part_stock")
    .select("id, part_id, cmms_parts(name, part_number, category, unit_cost, unit_of_measure, company_id), location_id, locations(name), quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity")
    .eq("company_id", companyId)
    .order("quantity_on_hand", { ascending: true })
    .limit(200);

  if (error) return capabilityError(error.message);

  // Filter by company_id on parts
  const items = (stock || []).filter((s: any) => s.cmms_parts?.company_id === companyId);

  const lowStock = items.filter((s: any) =>
    s.reorder_point != null && s.quantity_on_hand <= s.reorder_point
  );

  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    const filtered = items.filter((s: any) => s.location_id === loc.id);
    return success({
      total: filtered.length,
      low_stock_count: filtered.filter((s: any) => s.reorder_point != null && s.quantity_on_hand <= s.reorder_point).length,
      stock: filtered.map((s: any) => ({
        part: s.cmms_parts?.name,
        part_number: s.cmms_parts?.part_number,
        location: s.locations?.name,
        quantity_on_hand: s.quantity_on_hand,
        quantity_reserved: s.quantity_reserved,
        reorder_point: s.reorder_point,
        low_stock: s.reorder_point != null && s.quantity_on_hand <= s.reorder_point,
        unit_cost: s.cmms_parts?.unit_cost,
      })),
    });
  }

  return success({
    total: items.length,
    low_stock_count: lowStock.length,
    low_stock_items: lowStock.slice(0, 20).map((s: any) => ({
      part: s.cmms_parts?.name,
      part_number: s.cmms_parts?.part_number,
      location: s.locations?.name,
      quantity_on_hand: s.quantity_on_hand,
      reorder_point: s.reorder_point,
    })),
    all_stock: items.slice(0, 100).map((s: any) => ({
      part: s.cmms_parts?.name,
      location: s.locations?.name,
      quantity_on_hand: s.quantity_on_hand,
      reorder_point: s.reorder_point,
      low_stock: s.reorder_point != null && s.quantity_on_hand <= s.reorder_point,
    })),
  });
}

export async function listCmmsVendors(
  sb: any, companyId: string, _args: any
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("cmms_vendors")
    .select("id, name, contact_name, contact_email, contact_phone, website, is_active")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(100);

  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    vendors: (data || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      contact_name: v.contact_name,
      contact_email: v.contact_email,
      contact_phone: v.contact_phone,
      website: v.website,
    })),
  });
}

export async function createPurchaseOrderDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "cmms");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  if (!args.items || args.items.length === 0) return capabilityError("items array is required (at minimum one item with part_name and quantity).");

  // Resolve vendor
  let vendorId: string | null = null;
  let vendorName: string | null = null;
  if (args.vendor_name) {
    const { data: vendor } = await sb.from("cmms_vendors").select("id, name")
      .eq("company_id", companyId).ilike("name", `%${args.vendor_name}%`).limit(1).maybeSingle();
    if (!vendor) return capabilityError(`No vendor matching "${args.vendor_name}".`);
    vendorId = vendor.id; vendorName = vendor.name;
  }

  // Resolve parts
  const resolvedItems: any[] = [];
  for (const item of args.items) {
    let partId: string | null = item.part_id || null;
    let partName = item.part_name || null;
    let unitCost = item.unit_cost ?? null;
    if (!partId && partName) {
      const { data: part } = await sb.from("cmms_parts").select("id, name, unit_cost")
        .eq("company_id", companyId).ilike("name", `%${partName}%`).limit(1).maybeSingle();
      if (part) { partId = part.id; partName = part.name; unitCost = unitCost ?? part.unit_cost; }
    }
    resolvedItems.push({ part_id: partId, part_name: partName, quantity: item.quantity, unit_cost: unitCost });
  }

  const totalEstimate = resolvedItems.reduce((sum: number, i: any) => sum + (i.quantity * (i.unit_cost || 0)), 0);

  const draft = {
    vendor_id: vendorId,
    vendor_name: vendorName,
    notes: args.notes || null,
    items: resolvedItems,
    total_estimate: totalEstimate,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "create_purchase_order", risk_level: "medium",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id, action_name: "create_purchase_order", risk_level: "medium",
    title: "Create Purchase Order",
    summary: `Purchase order for ${resolvedItems.length} item(s)${vendorName ? ` from **${vendorName}**` : ""}. Estimated total: ${totalEstimate.toFixed(2)}.`,
    fields: [
      ...(vendorName ? [{ label: "Vendor", value: vendorName }] : []),
      ...resolvedItems.map((i: any) => ({ label: i.part_name || "Part", value: `Qty: ${i.quantity}${i.unit_cost ? ` @ ${i.unit_cost}` : ""}` })),
      { label: "Est. Total", value: String(totalEstimate.toFixed(2)) },
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeCreatePurchaseOrder(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "cmms");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: po, error: poError } = await sbService.from("cmms_purchase_orders").insert({
    company_id: companyId,
    vendor_id: d.vendor_id || null,
    notes: d.notes || null,
    status: "draft",
    created_by: userId,
  }).select("id").single();

  if (poError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: poError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create purchase order: ${poError.message}`);
  }

  // Insert line items
  if (d.items?.length > 0) {
    const lineItems = d.items.map((i: any) => ({
      purchase_order_id: po.id,
      part_id: i.part_id || null,
      part_name: i.part_name,
      quantity: i.quantity,
      unit_cost: i.unit_cost || null,
    }));
    await sbService.from("cmms_purchase_order_items").insert(lineItems);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, po_id: po.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Purchase Order Created",
    summary: `Purchase order created for ${d.items?.length} item(s)${d.vendor_name ? ` from ${d.vendor_name}` : ""}. Est. total: ${d.total_estimate?.toFixed(2)}.`,
  }));

  return success({ type: "purchase_order_created", po_id: po.id });
}

// ─── General Approval Workflows ───

export async function listAllPendingApprovals(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("approval_requests")
    .select("id, workflow_id, approval_workflows(name), entity_type, entity_id, entity_title, current_step, status, requested_by, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  else q = q.eq("status", "pending");
  if (args.entity_type) q = q.eq("entity_type", args.entity_type);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    approvals: (data || []).map((a: any) => ({
      id: a.id,
      workflow: a.approval_workflows?.name,
      entity_type: a.entity_type,
      entity_title: a.entity_title,
      current_step: a.current_step,
      status: a.status,
      created_at: a.created_at,
    })),
  });
}

export async function getApprovalRequestDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  if (!args.request_id) return capabilityError("request_id is required.");

  const { data: req, error } = await sb.from("approval_requests")
    .select("id, workflow_id, approval_workflows(name, steps), entity_type, entity_id, entity_title, current_step, status, requested_by, created_at")
    .eq("id", args.request_id).eq("company_id", companyId).maybeSingle();

  if (error) return capabilityError(error.message);
  if (!req) return capabilityError("Approval request not found.");

  const { data: decisions } = await sb.from("approval_decisions")
    .select("id, step_order, decided_by, decision, comment, decided_at")
    .eq("request_id", args.request_id)
    .order("decided_at", { ascending: true });

  return success({
    id: req.id,
    workflow: (req as any).approval_workflows?.name,
    entity_type: req.entity_type,
    entity_title: req.entity_title,
    current_step: req.current_step,
    status: req.status,
    created_at: req.created_at,
    decisions: (decisions || []).map((d: any) => ({
      step: d.step_order,
      decided_by: d.decided_by,
      decision: d.decision,
      comment: d.comment,
      decided_at: d.decided_at,
    })),
  });
}

export async function makeApprovalDecisionDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "update", "government_ops");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  if (!args.request_id) return capabilityError("request_id is required.");
  if (!["approve", "reject"].includes(args.decision)) return capabilityError("decision must be 'approve' or 'reject'.");

  const { data: req } = await sb.from("approval_requests")
    .select("id, entity_title, entity_type, current_step, status, approval_workflows(name)")
    .eq("id", args.request_id).eq("company_id", companyId).maybeSingle();

  if (!req) return capabilityError("Approval request not found.");
  if (req.status !== "pending") return capabilityError(`Request is already ${req.status}.`);

  const draft = {
    request_id: args.request_id,
    entity_title: req.entity_title,
    entity_type: req.entity_type,
    workflow_name: (req as any).approval_workflows?.name,
    current_step: req.current_step,
    decision: args.decision,
    comment: args.comment || null,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "make_approval_decision", risk_level: "high",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id, action_name: "make_approval_decision", risk_level: "high",
    title: `${args.decision === "approve" ? "Approve" : "Reject"} Request`,
    summary: `**${args.decision === "approve" ? "Approve" : "Reject"}** "${req.entity_title}" (${req.entity_type}) at step ${req.current_step}.`,
    fields: [
      { label: "Request", value: req.entity_title },
      { label: "Type", value: req.entity_type },
      { label: "Decision", value: args.decision.toUpperCase() },
      ...(args.comment ? [{ label: "Comment", value: args.comment }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeMakeApprovalDecision(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "update", "government_ops");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  // Record decision
  const { error: decError } = await sbService.from("approval_decisions").insert({
    request_id: d.request_id,
    step_order: d.current_step,
    decided_by: userId,
    decision: d.decision,
    comment: d.comment || null,
    decided_at: new Date().toISOString(),
  });

  if (decError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: decError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to record decision: ${decError.message}`);
  }

  // Update request status
  const newStatus = d.decision === "approve" ? "approved" : "rejected";
  await sbService.from("approval_requests").update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", d.request_id);

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, decision: d.decision, request_id: d.request_id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: `Request ${d.decision === "approve" ? "Approved" : "Rejected"}`,
    summary: `"${d.entity_title}" has been ${d.decision === "approve" ? "approved" : "rejected"}.${d.comment ? ` Comment: ${d.comment}` : ""}`,
  }));

  return success({ type: "approval_decision_made", decision: d.decision, request_id: d.request_id });
}

// ─── Activity Log ───

export async function getActivityLog(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("activity_logs")
    .select("id, user_id, action_type, entity_type, entity_id, entity_name, details, created_at, location_id, locations(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.user_id) q = q.eq("user_id", args.user_id);
  if (args.action_type) q = q.eq("action_type", args.action_type);
  if (args.entity_type) q = q.eq("entity_type", args.entity_type);
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  // Resolve user by name
  if (args.user_name) {
    const { data: emp } = await sb.from("employees").select("id")
      .eq("company_id", companyId).ilike("full_name", `%${args.user_name}%`).limit(1).maybeSingle();
    if (!emp) {
      // Try users table
      const { data: usr } = await sb.from("users").select("id")
        .ilike("full_name", `%${args.user_name}%`).limit(1).maybeSingle();
      if (usr) q = q.eq("user_id", usr.id);
    } else {
      q = q.eq("user_id", emp.id);
    }
  }

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    entries: (data || []).map((e: any) => ({
      id: e.id,
      user_id: e.user_id,
      action_type: e.action_type,
      entity_type: e.entity_type,
      entity_name: e.entity_name,
      location: e.locations?.name,
      details: e.details,
      created_at: e.created_at,
    })),
  });
}

// ─── CMMS Teams ───

export async function listCmmsTeams(
  sb: any, companyId: string, _args: any
): Promise<CapabilityResult<any>> {
  const { data: teams, error } = await sb.from("cmms_teams")
    .select("id, name, description, is_active")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(100);

  if (error) return capabilityError(error.message);

  // Get member counts
  const teamIds = (teams || []).map((t: any) => t.id);
  let memberCounts: Record<string, number> = {};

  if (teamIds.length > 0) {
    const { data: members } = await sb.from("cmms_team_members")
      .select("team_id").in("team_id", teamIds);
    for (const m of members || []) {
      memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1;
    }
  }

  return success({
    total: teams?.length ?? 0,
    teams: (teams || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      member_count: memberCounts[t.id] || 0,
    })),
  });
}

// ─── Training Session Attendees ───

export async function listTrainingSessionAttendees(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Resolve session: by id or by session_name
  let sessionId = args.session_id || null;
  if (!sessionId && args.session_name) {
    const { data: sessions } = await sb.from("training_sessions")
      .select("id, title").eq("company_id", companyId).ilike("title", `%${args.session_name}%`).limit(1);
    if (!sessions?.length) return capabilityError(`No training session matching "${args.session_name}".`);
    sessionId = sessions[0].id;
  }
  if (!sessionId) return capabilityError("session_id or session_name is required.");

  // Verify company ownership
  const { data: sess } = await sb.from("training_sessions").select("id, company_id, title").eq("id", sessionId).maybeSingle();
  if (!sess || sess.company_id !== companyId) return capabilityError("Training session not found.");

  const { data, error } = await sb.from("training_session_attendees")
    .select("id, session_id, employee_id, attended, score, notes, employees(full_name)")
    .eq("session_id", sessionId)
    .limit(200);

  if (error) return capabilityError(error.message);

  return success({
    session_title: sess.title,
    total_attendees: data?.length ?? 0,
    attendees: (data || []).map((a: any) => ({
      employee: a.employees?.full_name,
      attended: a.attended,
      score: a.score,
      notes: a.notes,
    })),
  });
}

// ─── Training Evaluations ───

export async function createTrainingEvaluationDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve assignment
  let assignmentId = args.assignment_id || null;
  let employeeName: string | null = null;
  let moduleName: string | null = null;

  if (!assignmentId) {
    // Resolve by employee + module name
    let empId: string | null = null;
    if (args.employee_name) {
      const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(1);
      if (!emps?.length) return capabilityError(`Employee "${args.employee_name}" not found.`);
      empId = emps[0].id; employeeName = emps[0].full_name;
    }
    if (empId) {
      const q = sb.from("training_assignments").select("id, module_id, training_programs(name)").eq("company_id", companyId).eq("trainee_employee_id", empId).in("status", ["assigned", "in_progress", "completed"]);
      const { data: assignments } = await q.limit(1);
      if (assignments?.[0]) { assignmentId = assignments[0].id; moduleName = assignments[0].training_programs?.name; }
    }
  } else {
    const { data: asgn } = await sb.from("training_assignments").select("id, trainee_employee_id, employees!training_assignments_trainee_employee_id_fkey(full_name), module_id, training_programs(name), company_id").eq("id", assignmentId).maybeSingle();
    if (!asgn || asgn.company_id !== companyId) return capabilityError("Training assignment not found.");
    employeeName = asgn.employees?.full_name;
    moduleName = asgn.training_programs?.name;
  }

  if (!assignmentId) return capabilityError("Could not resolve training assignment. Provide assignment_id or employee_name.");

  const draft = {
    assignment_id: assignmentId,
    employee_name: employeeName,
    module_name: moduleName,
    score: args.score != null ? Number(args.score) : null,
    passed: args.passed ?? (args.score != null ? args.score >= (args.passing_score || 70) : null),
    feedback: args.feedback || null,
    evaluated_by: userId,
  };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "create_training_evaluation",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Training Evaluation",
    summary: `Evaluate ${employeeName || "employee"} on "${moduleName || "module"}" — Score: ${draft.score ?? "N/A"}, Passed: ${draft.passed ?? "N/A"}`,
    risk: "medium",
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "training_evaluation_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeTrainingEvaluation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: evData, error: evError } = await sbService.from("training_evaluations").insert({
    assignment_id: d.assignment_id,
    score: d.score,
    passed: d.passed,
    feedback: d.feedback,
    evaluated_by: d.evaluated_by,
    evaluated_at: new Date().toISOString(),
  }).select("id").single();

  if (evError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: evError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to record evaluation: ${evError.message}`);
  }

  // Update assignment status to completed
  await sbService.from("training_assignments").update({
    status: "completed", completed_at: new Date().toISOString(),
  }).eq("id", d.assignment_id).catch(() => {});

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, evaluation_id: evData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Training Evaluation Recorded",
    summary: `Evaluation for ${d.employee_name} on "${d.module_name}": score ${d.score ?? "N/A"}, ${d.passed ? "PASSED" : "FAILED"}.`,
  }));

  return success({ type: "training_evaluated", evaluation_id: evData.id });
}
