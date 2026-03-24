/**
 * Workforce Capability Module
 * Phase 8: Standardized on CapabilityResult + permission enforcement.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function searchEmployees(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 10, 200);
  const term = `%${args.query}%`;
  const { data, error } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)")
    .eq("company_id", companyId).or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`).limit(limit);
  if (error) return capabilityError(error.message);
  return success({ count: data?.length ?? 0, employees: data?.map((e: any) => ({ id: e.id, name: e.full_name, role: e.role, status: e.status, location: e.locations?.name })) });
}

export async function getAttendanceExceptions(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  const ur = await utcRange(sb, args.from, args.to);
  if (!ur) return capabilityError("Failed to convert date range");
  let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
    .gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc)
    .or("is_late.eq.true,check_out_at.is.null").order("check_in_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    exceptions: c.items.map((l: any) => ({ id: l.id, employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at, is_late: l.is_late, late_minutes: l.late_minutes, auto_clocked_out: l.auto_clocked_out, location: l.locations?.name })),
    total: c.total, returned: c.returned, truncated: c.truncated,
  });
}

// ─── Draft Tools ───

export async function createEmployeeDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  let locationId = null;
  if (args.location_name) {
    const { data: locData } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1);
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

  return success({
    type: "employee_draft",
    draft,
    missing_fields: missing,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "medium",
    message: missing.length > 0
      ? `Draft created but missing: ${missing.join(", ")}. Please provide these to proceed.`
      : `Employee draft ready for "${draft.full_name}". A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
  });
}

export async function createShiftDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

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
      return success({ action: "Create Shift", summary: `Multiple locations match "${locationName}". Please select.`, risk: "medium", can_approve: false, missing_fields: ["location"], requires_approval: true, message: `Found ${data.length} locations matching "${locationName}". Please clarify.` });
    }
  }

  // Server-side date resolution (Europe/Bucharest)
  const nowBucharest = new Date().toLocaleString("en-CA", { timeZone: "Europe/Bucharest" }).split(",")[0];
  let resolvedDate = args.shift_date;
  if (!resolvedDate || resolvedDate === "today") {
    resolvedDate = nowBucharest;
  } else if (resolvedDate === "tomorrow") {
    const tom = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
    tom.setDate(tom.getDate() + 1);
    resolvedDate = tom.toISOString().split("T")[0];
  } else {
    const parsed = new Date(resolvedDate);
    const now = new Date();
    if (!isNaN(parsed.getTime())) {
      const diffMs = now.getTime() - parsed.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        console.warn(`[Dash] Stale shift_date "${resolvedDate}" detected (${Math.round(diffDays)} days old), overriding to today: ${nowBucharest}`);
        resolvedDate = nowBucharest;
      }
    }
  }

  // Resolve employee by name
  let employeeId = args.employee_id || null;
  let employeeName = args.employee_name || null;
  if (employeeName && !employeeId) {
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
      return success({ action: "Create Shift", summary: `Multiple employees match "${args.employee_name}". Please select one.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Found ${empData.length} employees matching "${args.employee_name}". Please clarify.` });
    } else {
      // Token-reversed match
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
            return success({ action: "Create Shift", summary: `Could not find exact match for "${args.employee_name}". Please select from candidates.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Found possible matches for "${args.employee_name}". Please clarify.` });
          }
        }
      }
      if (!found) {
        return success({ action: "Create Shift", summary: `Employee "${args.employee_name}" not found in this company. Please provide a valid employee name.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Could not find employee "${args.employee_name}". Please check the name and try again, or ask me to list employees.` });
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

  return success({
    type: "shift_draft",
    draft,
    missing_fields: missing,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "medium",
    message: missing.length > 0
      ? `Shift draft missing: ${missing.join(", ")}.`
      : `Shift draft ready. User can approve to create.`,
  });
}

// ─── Execute Tools ───

export async function executeEmployeeCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  hydrateArgsFromDraft: (actionName: string, previewJson: any) => Record<string, any>,
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  if (args.pending_action_id && !args.full_name) {
    const { data: pa } = await sbService.from("dash_pending_actions")
      .select("id, status, company_id, preview_json")
      .eq("id", args.pending_action_id)
      .maybeSingle();
    if (pa && pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
    if (pa && pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);
    if (pa?.preview_json) {
      const preview = pa.preview_json as any;
      args = { ...args, ...hydrateArgsFromDraft("create_employee", preview) };
    }
  } else if (args.pending_action_id) {
    const { data: pa } = await sbService.from("dash_pending_actions")
      .select("id, status, company_id")
      .eq("id", args.pending_action_id)
      .maybeSingle();
    if (pa && pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
    if (pa && pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);
  }

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
    return capabilityError(`Failed to create employee: ${empError.message}`);
  }

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

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "workforce.create_employee", actionType: "write",
    riskLevel: "medium", request: args,
    result: { employee_id: empData.id },
    entitiesAffected: [empData.id], module: "workforce",
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Employee Created",
    summary: `${empData.full_name} has been created successfully.`,
    changes: [`Employee "${empData.full_name}" created (ID: ${empData.id})`],
  }));

  return success({
    type: "employee_created",
    employee_id: empData.id,
    employee_name: empData.full_name,
    message: `Employee "${empData.full_name}" created successfully.`,
  });
}

export async function executeShiftCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

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
    return capabilityError(`Failed to create shift: ${shiftError.message}`);
  }

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

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "workforce.create_shift", actionType: "write",
    riskLevel: "medium", request: draft,
    result: { shift_id: shiftData.id, assignment_created: assignmentCreated },
    entitiesAffected: [shiftData.id], module: "workforce",
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

  return success({
    type: "shift_created",
    shift_id: shiftData.id,
    assignment_created: assignmentCreated,
    message: `Shift created successfully for ${shiftData.shift_date}${assignmentMsg}.`,
  });
}

// ─── Shift Lookup Helper ───

async function findShift(
  sb: any, companyId: string, args: any
): Promise<{ shift: any; assignment: any; error?: string }> {
  // Direct ID lookup
  if (args.shift_id) {
    const { data: shift } = await sb.from("shifts")
      .select("id, shift_date, start_time, end_time, role, location_id, locations(name), status, company_id")
      .eq("id", args.shift_id).maybeSingle();
    if (!shift) return { shift: null, assignment: null, error: "Shift not found." };
    if (shift.company_id !== companyId) return { shift: null, assignment: null, error: "Cross-tenant action rejected." };
    const { data: assignment } = await sb.from("shift_assignments")
      .select("id, staff_id, employees(full_name), status")
      .eq("shift_id", shift.id).limit(1).maybeSingle();
    return { shift, assignment };
  }

  // Lookup by employee + date + optional location
  if (args.employee_name && args.shift_date) {
    const { data: empData } = await sb.from("employees")
      .select("id, full_name").eq("company_id", companyId)
      .ilike("full_name", `%${args.employee_name}%`).limit(5);
    if (!empData?.length) return { shift: null, assignment: null, error: `Employee "${args.employee_name}" not found.` };
    if (empData.length > 1) return { shift: null, assignment: null, error: `Multiple employees match "${args.employee_name}": ${empData.map((e: any) => e.full_name).join(", ")}. Please be more specific.` };
    const empId = empData[0].id;
    const empName = empData[0].full_name;

    // Find shift assignments for this employee on this date
    const { data: assignments } = await sb.from("shift_assignments")
      .select("id, shift_id, staff_id, status, shifts(id, shift_date, start_time, end_time, role, location_id, locations(name), status, company_id)")
      .eq("staff_id", empId).eq("shifts.shift_date", args.shift_date).limit(5);

    const valid = (assignments || []).filter((a: any) => a.shifts && a.shifts.company_id === companyId);
    if (!valid.length) return { shift: null, assignment: null, error: `No shift found for ${empName} on ${args.shift_date}.` };
    if (valid.length > 1 && args.location_name) {
      const filtered = valid.filter((a: any) => a.shifts.locations?.name?.toLowerCase().includes(args.location_name.toLowerCase()));
      if (filtered.length === 1) return { shift: filtered[0].shifts, assignment: { id: filtered[0].id, staff_id: filtered[0].staff_id, employees: { full_name: empName }, status: filtered[0].status } };
    }
    if (valid.length > 1) return { shift: null, assignment: null, error: `${empName} has ${valid.length} shifts on ${args.shift_date}. Please specify location or time.` };
    return { shift: valid[0].shifts, assignment: { id: valid[0].id, staff_id: valid[0].staff_id, employees: { full_name: empName }, status: valid[0].status } };
  }

  return { shift: null, assignment: null, error: "Please provide a shift_id, or employee_name + shift_date to identify the shift." };
}

// ─── Draft: Update Shift ───

export async function updateShiftDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { shift, assignment, error } = await findShift(sb, companyId, args);
  if (error || !shift) return capabilityError(error || "Shift not found.");

  // Resolve new employee if reassigning
  let newEmployeeId: string | null = null;
  let newEmployeeName: string | null = null;
  if (args.new_employee_name) {
    const { data: empData } = await sb.from("employees")
      .select("id, full_name").eq("company_id", companyId)
      .ilike("full_name", `%${args.new_employee_name}%`).limit(5);
    if (!empData?.length) return capabilityError(`Employee "${args.new_employee_name}" not found.`);
    if (empData.length > 1) return capabilityError(`Multiple employees match "${args.new_employee_name}": ${empData.map((e: any) => e.full_name).join(", ")}`);
    newEmployeeId = empData[0].id;
    newEmployeeName = empData[0].full_name;
  }

  const changes: Record<string, { from: any; to: any }> = {};
  if (args.new_start_time && args.new_start_time !== shift.start_time) changes.start_time = { from: shift.start_time, to: args.new_start_time };
  if (args.new_end_time && args.new_end_time !== shift.end_time) changes.end_time = { from: shift.end_time, to: args.new_end_time };
  if (args.new_shift_date && args.new_shift_date !== shift.shift_date) changes.shift_date = { from: shift.shift_date, to: args.new_shift_date };
  if (args.new_role && args.new_role !== shift.role) changes.role = { from: shift.role, to: args.new_role };
  if (newEmployeeId) changes.employee = { from: assignment?.employees?.full_name || "unassigned", to: newEmployeeName };

  if (Object.keys(changes).length === 0) return capabilityError("No changes specified. Please tell me what to change (time, date, role, or employee).");

  const preview = {
    shift_id: shift.id,
    shift_date: shift.shift_date,
    location_name: shift.locations?.name,
    current: { start_time: shift.start_time, end_time: shift.end_time, role: shift.role, employee: assignment?.employees?.full_name || "unassigned" },
    changes,
    new_employee_id: newEmployeeId,
    old_assignment_id: assignment?.id || null,
    old_employee_id: assignment?.staff_id || null,
    reason: args.reason,
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_shift",
    action_type: "write", risk_level: "medium", preview_json: preview, status: "pending",
  }).select("id").single();

  const changeSummary = Object.entries(changes).map(([k, v]: any) => `${k}: ${v.from} → ${v.to}`).join(", ");
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Shift",
    summary: `${shift.locations?.name} on ${shift.shift_date}: ${changeSummary}`,
    risk: "medium",
    affected: [shift.locations?.name, assignment?.employees?.full_name, newEmployeeName].filter(Boolean),
    pending_action_id: paData?.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData?.id,
    message: `Shift update draft created. Changes: ${changeSummary}. Please approve to proceed.`,
  });
}

// ─── Execute: Update Shift ───

export async function executeShiftUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const preview = pa.preview_json as any;
  const updateFields: any = { updated_at: new Date().toISOString() };
  if (preview.changes.start_time) updateFields.start_time = preview.changes.start_time.to;
  if (preview.changes.end_time) updateFields.end_time = preview.changes.end_time.to;
  if (preview.changes.shift_date) updateFields.shift_date = preview.changes.shift_date.to;
  if (preview.changes.role) updateFields.role = preview.changes.role.to;

  const { error: updateError } = await sbService.from("shifts")
    .update(updateFields).eq("id", preview.shift_id).eq("company_id", companyId);

  if (updateError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Shift Update Failed", summary: updateError.message, errors: [updateError.message] }));
    return capabilityError(`Shift update failed: ${updateError.message}`);
  }

  // Handle employee reassignment if requested
  if (preview.new_employee_id) {
    if (preview.old_assignment_id) {
      await sbService.from("shift_assignments").delete().eq("id", preview.old_assignment_id);
    }
    await sbService.from("shift_assignments").insert({
      shift_id: preview.shift_id, staff_id: preview.new_employee_id,
      assigned_by: userId, status: "assigned", approval_status: "approved", approved_by: userId, approved_at: new Date().toISOString(),
    });
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "workforce.update_shift", actionType: "write",
    riskLevel: "medium", request: preview, result: { shift_id: preview.shift_id, changes: preview.changes },
    entitiesAffected: [preview.shift_id], module: "workforce",
  });

  const changeSummary = Object.entries(preview.changes).map(([k, v]: any) => `${k}: ${v.from} → ${v.to}`).join(", ");
  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Shift Updated",
    summary: `Shift at ${preview.location_name} on ${preview.shift_date} updated: ${changeSummary}`,
    changes: Object.entries(preview.changes).map(([k, v]: any) => `${k}: ${v.from} → ${v.to}`),
  }));

  return success({ type: "shift_updated", shift_id: preview.shift_id, message: `Shift updated successfully.` });
}

// ─── Draft: Delete Shift ───

export async function deleteShiftDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { shift, assignment, error } = await findShift(sb, companyId, args);
  if (error || !shift) return capabilityError(error || "Shift not found.");

  const preview = {
    shift_id: shift.id, shift_date: shift.shift_date,
    start_time: shift.start_time, end_time: shift.end_time,
    role: shift.role, location_name: shift.locations?.name,
    employee_name: assignment?.employees?.full_name || "unassigned",
    assignment_id: assignment?.id || null,
    reason: args.reason,
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_shift",
    action_type: "write", risk_level: "high", preview_json: preview, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Shift",
    summary: `Remove ${preview.role} shift at ${preview.location_name} on ${preview.shift_date} (${preview.start_time}-${preview.end_time}), assigned to ${preview.employee_name}`,
    risk: "high",
    affected: [preview.location_name, preview.employee_name, preview.shift_date].filter(Boolean),
    pending_action_id: paData?.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData?.id,
    message: `Shift deletion draft created. This will remove the shift and its assignment. Please approve.`,
  });
}

// ─── Execute: Delete Shift ───

export async function executeShiftDeletion(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const preview = pa.preview_json as any;

  // Remove assignment first, then cancel the shift
  if (preview.assignment_id) {
    await sbService.from("shift_assignments").delete().eq("id", preview.assignment_id);
  }

  const { error: delError } = await sbService.from("shifts")
    .update({ cancelled_at: new Date().toISOString(), status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", preview.shift_id).eq("company_id", companyId);

  if (delError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: delError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Shift Deletion Failed", summary: delError.message, errors: [delError.message] }));
    return capabilityError(`Shift deletion failed: ${delError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "workforce.delete_shift", actionType: "write",
    riskLevel: "high", request: preview, result: { shift_id: preview.shift_id, cancelled: true },
    entitiesAffected: [preview.shift_id], module: "workforce",
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Shift Cancelled",
    summary: `${preview.role} shift at ${preview.location_name} on ${preview.shift_date} has been cancelled.`,
    changes: [`Shift cancelled`, `Assignment for ${preview.employee_name} removed`],
  }));

  return success({ type: "shift_deleted", shift_id: preview.shift_id, message: `Shift cancelled successfully.` });
}

// ─── Draft: Swap Shifts ───

export async function swapShiftDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve both employees
  const resolve = async (name: string) => {
    const { data } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${name}%`).limit(5);
    if (!data?.length) return { error: `Employee "${name}" not found.` };
    if (data.length > 1) return { error: `Multiple employees match "${name}": ${data.map((e: any) => e.full_name).join(", ")}` };
    return { id: data[0].id, name: data[0].full_name };
  };

  const empA = await resolve(args.employee_a_name);
  if (empA.error) return capabilityError(empA.error);
  const empB = await resolve(args.employee_b_name);
  if (empB.error) return capabilityError(empB.error);

  // Find their assignments on the given date
  const findAssignment = async (empId: string, empName: string) => {
    const { data } = await sb.from("shift_assignments")
      .select("id, shift_id, staff_id, shifts(id, shift_date, start_time, end_time, role, location_id, locations(name), company_id)")
      .eq("staff_id", empId).eq("shifts.shift_date", args.shift_date).limit(5);
    const valid = (data || []).filter((a: any) => a.shifts && a.shifts.company_id === companyId);
    if (!valid.length) return { error: `No shift found for ${empName} on ${args.shift_date}.` };
    if (valid.length > 1 && args.location_name) {
      const filtered = valid.filter((a: any) => a.shifts.locations?.name?.toLowerCase().includes(args.location_name.toLowerCase()));
      if (filtered.length === 1) return filtered[0];
    }
    if (valid.length > 1) return { error: `${empName} has ${valid.length} shifts on ${args.shift_date}. Please specify location.` };
    return valid[0];
  };

  const assA = await findAssignment(empA.id!, empA.name!);
  if (assA.error) return capabilityError(assA.error);
  const assB = await findAssignment(empB.id!, empB.name!);
  if (assB.error) return capabilityError(assB.error);

  const preview = {
    employee_a: { id: empA.id, name: empA.name, assignment_id: assA.id, shift_id: assA.shift_id, shift: `${assA.shifts.start_time}-${assA.shifts.end_time} ${assA.shifts.role} at ${assA.shifts.locations?.name}` },
    employee_b: { id: empB.id, name: empB.name, assignment_id: assB.id, shift_id: assB.shift_id, shift: `${assB.shifts.start_time}-${assB.shifts.end_time} ${assB.shifts.role} at ${assB.shifts.locations?.name}` },
    shift_date: args.shift_date,
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "swap_shifts",
    action_type: "write", risk_level: "high", preview_json: preview, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Swap Shifts",
    summary: `Swap on ${args.shift_date}: ${empA.name} (${preview.employee_a.shift}) ↔ ${empB.name} (${preview.employee_b.shift})`,
    risk: "high",
    affected: [empA.name, empB.name],
    pending_action_id: paData?.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData?.id,
    message: `Shift swap draft created. ${empA.name} and ${empB.name} will trade shifts. Please approve.`,
  });
}

// ─── Execute: Swap Shifts ───

export async function executeShiftSwap(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const preview = pa.preview_json as any;
  const a = preview.employee_a;
  const b = preview.employee_b;

  // Swap: update assignment A to point to employee B, and B to employee A
  const { error: e1 } = await sbService.from("shift_assignments")
    .update({ staff_id: b.id, assigned_by: userId, assigned_at: new Date().toISOString() })
    .eq("id", a.assignment_id);
  const { error: e2 } = await sbService.from("shift_assignments")
    .update({ staff_id: a.id, assigned_by: userId, assigned_at: new Date().toISOString() })
    .eq("id", b.assignment_id);

  if (e1 || e2) {
    const errMsg = (e1?.message || "") + " " + (e2?.message || "");
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: errMsg.trim() }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Shift Swap Failed", summary: errMsg.trim(), errors: [errMsg.trim()] }));
    return capabilityError(`Shift swap failed: ${errMsg.trim()}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "workforce.swap_shifts", actionType: "write",
    riskLevel: "high", request: preview, result: { swapped: [a.assignment_id, b.assignment_id] },
    entitiesAffected: [a.shift_id, b.shift_id], module: "workforce",
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Shifts Swapped",
    summary: `${a.name} and ${b.name} have swapped shifts on ${preview.shift_date}.`,
    changes: [`${a.name} → ${b.shift}`, `${b.name} → ${a.shift}`],
  }));

  return success({ type: "shifts_swapped", message: `Shifts swapped successfully between ${a.name} and ${b.name}.` });
}
