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

export async function getEmployeeShifts(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Resolve employee
  const { data: empData } = await sb.from("employees")
    .select("id, full_name").eq("company_id", companyId)
    .ilike("full_name", `%${args.employee_name}%`).limit(5);
  if (!empData?.length) return capabilityError(`Employee "${args.employee_name}" not found.`);
  if (empData.length > 1) return capabilityError(`Multiple employees match "${args.employee_name}": ${empData.map((e: any) => e.full_name).join(", ")}. Please be more specific.`);
  const emp = empData[0];

  // Build query for shift_assignments with shifts joined
  let q = sb.from("shift_assignments")
    .select("id, status, shifts(id, shift_date, start_time, end_time, role, status, locations(name))")
    .eq("staff_id", emp.id)
    .order("shifts(shift_date)", { ascending: false });

  // Optional date range filters
  if (args.from_date || args.to_date) {
    // Fetch all and filter in JS (join filter unreliable)
    q = q.limit(100);
  } else {
    q = q.limit(args.limit ? Math.min(args.limit, 50) : 20);
  }

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  let shifts = (data || [])
    .filter((a: any) => a.shifts)
    .map((a: any) => ({
      shift_id: a.shifts.id,
      date: a.shifts.shift_date,
      start_time: a.shifts.start_time,
      end_time: a.shifts.end_time,
      role: a.shifts.role,
      location: a.shifts.locations?.name,
      status: a.shifts.status,
      assignment_status: a.status,
    }));

  // Filter by date range in JS if provided
  if (args.from_date) {
    shifts = shifts.filter((s: any) => s.date && (s.date === args.from_date || s.date > args.from_date || s.date?.startsWith(args.from_date)));
  }
  if (args.to_date) {
    shifts = shifts.filter((s: any) => s.date && (s.date <= args.to_date || s.date?.startsWith(args.to_date)));
  }

  // Sort by date descending
  shifts.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

  return success({
    employee: emp.full_name,
    total: shifts.length,
    shifts,
  }, { count: shifts.length, truncated: false });
}

// ─── Location Name Resolution (shared) ───
async function resolveLocationIdForWorkforce(sb: any, companyId: string, locationName: string): Promise<{ id: string; name: string } | null> {
  const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1).maybeSingle();
  return data ?? null;
}

export async function getAttendanceExceptions(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  const ur = await utcRange(sb, args.from, args.to);
  if (!ur) return capabilityError("Failed to convert date range");

  // Resolve location_name → location_id
  let locationId = args.location_id || null;
  if (!locationId && args.location_name) {
    const loc = await resolveLocationIdForWorkforce(sb, companyId, args.location_name);
    if (!loc) return capabilityError(`No location matching "${args.location_name}"`);
    locationId = loc.id;
  }

  let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
    .gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc)
    .or("is_late.eq.true,check_out_at.is.null").order("check_in_at", { ascending: false }).limit(limit);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    exceptions: c.items.map((l: any) => ({ id: l.id, employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at, is_late: l.is_late, late_minutes: l.late_minutes, auto_clocked_out: l.auto_clocked_out, location: l.locations?.name })),
    total: c.total, returned: c.returned, truncated: c.truncated,
  });
}

export async function getAttendanceSummary(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 100, 200);
  const ur = await utcRange(sb, args.from, args.to);
  if (!ur) return capabilityError("Failed to convert date range");

  // Resolve location_name → location_id
  let locationId = args.location_id || null;
  let resolvedLocationName: string | null = null;
  if (!locationId && args.location_name) {
    const loc = await resolveLocationIdForWorkforce(sb, companyId, args.location_name);
    if (!loc) return capabilityError(`No location matching "${args.location_name}"`);
    locationId = loc.id;
    resolvedLocationName = loc.name;
  }

  // Scope to company locations if no specific location
  if (!locationId) {
    const { data: compLocs } = await sb.from("locations").select("id").eq("company_id", companyId).eq("status", "active");
    if (!compLocs || compLocs.length === 0) return success({ logs: [], total: 0, returned: 0, truncated: false });
    const locIds = compLocs.map((l: any) => l.id);

    let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
      .in("location_id", locIds)
      .gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc)
      .order("check_in_at", { ascending: false }).limit(limit);
    const { data, error } = await q;
    if (error) return capabilityError(error.message);
    const c = cap(data, limit);
    return success({
      logs: c.items.map((l: any) => ({
        employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at,
        status: l.check_out_at ? "completed" : (l.auto_clocked_out ? "auto_clocked_out" : "working"), is_late: l.is_late, late_minutes: l.late_minutes,
        location: l.locations?.name,
      })),
      total_checked_in: c.items.length,
      currently_working: c.items.filter((l: any) => !l.check_out_at && !l.auto_clocked_out).length,
      total: c.total, returned: c.returned, truncated: c.truncated,
    });
  }

  let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
    .eq("location_id", locationId)
    .gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc)
    .order("check_in_at", { ascending: false }).limit(limit);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    location: resolvedLocationName || null,
    logs: c.items.map((l: any) => ({
      employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at,
      status: l.check_out_at ? "completed" : "working", is_late: l.is_late, late_minutes: l.late_minutes,
      location: l.locations?.name,
    })),
    total_checked_in: c.items.length,
    currently_working: c.items.filter((l: any) => !l.check_out_at).length,
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
    hire_date: args.hire_date || args.start_date || null,
    phone: args.phone || null,
    email: args.email || null,
    contract_type: args.contract_type || null,
    base_salary: args.base_salary != null ? Number(args.base_salary) : null,
    hourly_rate: args.hourly_rate != null ? Number(args.hourly_rate) : null,
    emergency_contact_name: args.emergency_contact_name || null,
    emergency_contact_phone: args.emergency_contact_phone || null,
  };

  const missing: string[] = [];
  if (!draft.full_name) missing.push("full_name");
  if (!draft.location_name && !draft.location_id) missing.push("location (which location?)");
  if (!draft.role) missing.push("role/position");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId,
      user_id: userId,
      action_name: "create_employee",
      action_type: "write",
      risk_level: "medium",
      preview_json: draft,
      status: "pending",
    }).select("id").single();
    if (paError || !paData?.id) {
      console.error("[Dash] create_employee_draft: pending action insert failed:", paError?.message);
      return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
    }
    pendingActionId = paData.id;
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

  const VALID_SHIFT_TYPES_CREATE = ["regular", "extra", "training", "half", "extra_half"];
  const shiftType = args.shift_type ? args.shift_type.toLowerCase().trim() : "regular";
  const validatedShiftType = VALID_SHIFT_TYPES_CREATE.includes(shiftType) ? shiftType : "regular";

  const draft = {
    location_id: locationId,
    location_name: locationName || null,
    role: args.role,
    shift_date: resolvedDate,
    start_time: args.start_time,
    end_time: args.end_time,
    shift_type: validatedShiftType,
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
    const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId,
      user_id: userId,
      action_name: "create_shift",
      action_type: "write",
      risk_level: "medium",
      preview_json: draft,
      status: "pending",
    }).select("id").single();
    if (paError || !paData?.id) {
      console.error("[Dash] create_shift_draft: pending action insert failed:", paError?.message);
      return capabilityError(`Failed to create draft: ${paError?.message || "database error"}. Please try again.`);
    }
    pendingActionId = paData.id;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Shift",
    summary: `${draft.role} [${validatedShiftType}] at ${locationName || "?"} on ${draft.shift_date} ${draft.start_time}-${draft.end_time}${employeeName ? ` → ${employeeName}` : ""}`,
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
    hire_date: args.hire_date || args.start_date || null,
    phone: args.phone || null,
    email: args.email || null,
    cnp: args.cnp || null,
    date_of_birth: args.date_of_birth || null,
    id_series: args.id_series || null,
    id_number: args.id_number || null,
    address: args.address || null,
    contract_type: args.contract_type || null,
    base_salary: args.base_salary != null ? Number(args.base_salary) : null,
    hourly_rate: args.hourly_rate != null ? Number(args.hourly_rate) : null,
    emergency_contact_name: args.emergency_contact_name || null,
    emergency_contact_phone: args.emergency_contact_phone || null,
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
      console.error("[Dash] executeShiftCreation: assignment insert failed:", assignError.message);
      // Shift WAS created; mark as executed with partial result
      await sbService.from("dash_pending_actions")
        .update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
          execution_result: { shift_id: shiftData.id, assignment_created: false, assignment_error: assignError.message },
          updated_at: new Date().toISOString() })
        .eq("id", pa.id);
      structuredEvents.push(makeStructuredEvent("execution_result", {
        status: "partial", title: "Shift Created (Assignment Failed)",
        summary: `Shift created for ${shiftData.shift_date} but employee assignment failed: ${assignError.message}. The shift exists but is unassigned.`,
        changes: [`Shift created for ${draft.shift_date}`, `Time: ${draft.start_time}–${draft.end_time}`],
        errors: [`Assignment failed: ${assignError.message}`],
      }));
      return success({ type: "shift_created", shift_id: shiftData.id, assignment_created: false,
        message: `Shift created for ${shiftData.shift_date} but employee assignment failed: ${assignError.message}` });
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
      .select("id, shift_date, start_time, end_time, role, shift_type, location_id, locations(name), status, company_id")
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

    // Find shift assignments for this employee — filter shift_date in JS to avoid unreliable PostgREST join filter
    const { data: assignments } = await sb.from("shift_assignments")
      .select("id, shift_id, staff_id, status, shifts(id, shift_date, start_time, end_time, role, shift_type, location_id, locations(name), status, company_id)")
      .eq("staff_id", empId).limit(30);

    const makeResult = (a: any) => ({
      shift: a.shifts,
      assignment: { id: a.id, staff_id: a.staff_id, employees: { full_name: empName }, status: a.status },
    });

    // Helper: safe location name match
    const locMatch = (a: any, locName: string) =>
      !!a.shifts.locations?.name?.toLowerCase()?.includes(locName.toLowerCase());

    // Helper: time match — handles "14:00" vs "14:00:00" stored in DB
    const timeMatch = (shiftTime: string | null, argTime: string) => {
      if (!shiftTime) return false;
      return shiftTime === argTime || shiftTime.startsWith(argTime);
    };

    // Step A: filter by company + date in JS
    // Use startsWith to handle timestamps ("2026-03-28T00:00:00+00:00") vs plain dates ("2026-03-28")
    let valid = (assignments || []).filter((a: any) =>
      a.shifts &&
      a.shifts.company_id === companyId &&
      (a.shifts.shift_date === args.shift_date || a.shifts.shift_date?.startsWith(args.shift_date))
    );
    if (!valid.length) return { shift: null, assignment: null, error: `No shift found for ${empName} on ${args.shift_date}.` };

    // Step B: cascade-filter by location → start_time → role when multiple shifts
    if (valid.length > 1) {
      if (args.location_name) {
        const byLoc = valid.filter((a: any) => locMatch(a, args.location_name));
        if (byLoc.length > 0) valid = byLoc;
      }
      if (valid.length > 1 && args.start_time) {
        const byTime = valid.filter((a: any) => timeMatch(a.shifts.start_time, args.start_time));
        if (byTime.length > 0) valid = byTime;
      }
      if (valid.length > 1 && args.role) {
        const byRole = valid.filter((a: any) =>
          a.shifts.role?.toLowerCase() === args.role.toLowerCase()
        );
        if (byRole.length > 0) valid = byRole;
      }
      if (valid.length > 1) {
        return { shift: null, assignment: null, error: `${empName} has ${valid.length} shifts on ${args.shift_date} matching those criteria. Please specify location, time, or role.` };
      }
      if (valid.length === 0) {
        return { shift: null, assignment: null, error: `No shift found for ${empName} on ${args.shift_date} matching those criteria.` };
      }
    }

    // Step C: single-shift guards
    const only = valid[0];
    // Location guard: user specified a location but the only shift found is at a different location
    if (args.location_name && !locMatch(only, args.location_name)) {
      const foundLoc = only.shifts.locations?.name || "unknown location";
      return { shift: null, assignment: null, error: `No shift found for ${empName} at "${args.location_name}" on ${args.shift_date}. Found a shift at ${foundLoc} instead — did you mean that one?` };
    }
    // Role guard: user specified a role but only shift has a different role
    if (args.role && only.shifts.role?.toLowerCase() !== args.role.toLowerCase()) {
      return { shift: null, assignment: null, error: `No ${args.role} shift found for ${empName} on ${args.shift_date}. Found role: ${only.shifts.role || "unspecified"}.` };
    }

    return makeResult(only);
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
  const VALID_SHIFT_TYPES = ["regular", "extra", "training", "half", "extra_half"];
  if (args.new_shift_type) {
    const normalized = args.new_shift_type.toLowerCase().trim();
    if (!VALID_SHIFT_TYPES.includes(normalized)) return capabilityError(`Invalid shift type "${args.new_shift_type}". Valid types: regular, extra, training, half.`);
    if (normalized !== (shift.shift_type || "regular")) changes.shift_type = { from: shift.shift_type || "regular", to: normalized };
  }
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_shift",
    action_type: "write", risk_level: "medium", preview_json: preview, status: "pending",
  }).select("id").single();

  if (paError || !paData?.id) {
    console.error("[Dash] update_shift_draft: pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create update draft: ${paError?.message || "database error"}. Please try again.`);
  }

  const changeSummary = Object.entries(changes).map(([k, v]: any) => `${k}: ${v.from} → ${v.to}`).join(", ");
  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Shift",
    summary: `${shift.locations?.name} on ${shift.shift_date}: ${changeSummary}`,
    risk: "medium",
    affected: [shift.locations?.name, assignment?.employees?.full_name, newEmployeeName].filter(Boolean),
    pending_action_id: paData.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData.id,
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
  if (preview.changes.shift_type) updateFields.shift_type = preview.changes.shift_type.to;

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
      const { error: delAssignError } = await sbService.from("shift_assignments").delete().eq("id", preview.old_assignment_id);
      if (delAssignError) {
        await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: delAssignError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
        structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Shift Update Failed", summary: `Failed to remove old assignment: ${delAssignError.message}`, errors: [delAssignError.message] }));
        return capabilityError(`Failed to remove old assignment: ${delAssignError.message}`);
      }
    }
    const { error: newAssignError } = await sbService.from("shift_assignments").insert({
      shift_id: preview.shift_id, staff_id: preview.new_employee_id,
      assigned_by: userId, status: "assigned", approval_status: "approved", approved_by: userId, approved_at: new Date().toISOString(),
    });
    if (newAssignError) {
      await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: newAssignError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
      structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Shift Update Failed", summary: `Shift fields updated but failed to assign employee: ${newAssignError.message}`, errors: [newAssignError.message] }));
      return capabilityError(`Shift fields updated but failed to assign employee: ${newAssignError.message}`);
    }
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "delete_shift",
    action_type: "write", risk_level: "high", preview_json: preview, status: "pending",
  }).select("id").single();

  // Guard: if the pending action insert failed, surface the error rather than proceeding
  // with a null pending_action_id (which causes "Pending action not found" on execution)
  if (paError || !paData?.id) {
    console.error("[Dash] delete_shift_draft: pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create deletion draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Delete Shift",
    summary: `Remove ${preview.role} shift at ${preview.location_name} on ${preview.shift_date} (${preview.start_time}-${preview.end_time}), assigned to ${preview.employee_name}`,
    risk: "high",
    affected: [preview.location_name, preview.employee_name, preview.shift_date].filter(Boolean),
    pending_action_id: paData.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData.id,
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
  if (!args.pending_action_id) return capabilityError("No pending action to execute — the draft may not have been saved correctly. Please recreate the deletion draft and try again.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found — it may have already been executed or expired. Please recreate the deletion draft and try again.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const preview = pa.preview_json as any;

  // Remove assignment first, then hard-delete the shift record
  if (preview.assignment_id) {
    const { error: delAssignError } = await sbService.from("shift_assignments").delete().eq("id", preview.assignment_id);
    if (delAssignError) {
      console.error("[Dash] executeShiftDeletion: failed to remove assignment, continuing with shift delete:", delAssignError.message);
    }
  }

  // Delete any remaining assignments for this shift (e.g. open-shift or multi-assign)
  const { error: delRemainingError } = await sbService.from("shift_assignments").delete().eq("shift_id", preview.shift_id);
  if (delRemainingError) {
    console.error("[Dash] executeShiftDeletion: failed to remove remaining assignments, continuing:", delRemainingError.message);
  }

  const { error: delError } = await sbService.from("shifts")
    .delete()
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
    riskLevel: "high", request: preview, result: { shift_id: preview.shift_id, deleted: true },
    entitiesAffected: [preview.shift_id], module: "workforce",
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Shift Deleted",
    summary: `${preview.role} shift at ${preview.location_name} on ${preview.shift_date} has been deleted.`,
    changes: [`Shift deleted`, `Assignment for ${preview.employee_name} removed`],
  }));

  return success({ type: "shift_deleted", shift_id: preview.shift_id, message: `Shift deleted successfully.` });
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

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "swap_shifts",
    action_type: "write", risk_level: "high", preview_json: preview, status: "pending",
  }).select("id").single();

  if (paError || !paData?.id) {
    console.error("[Dash] swap_shift_draft: pending action insert failed:", paError?.message);
    return capabilityError(`Failed to create swap draft: ${paError?.message || "database error"}. Please try again.`);
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Swap Shifts",
    summary: `Swap on ${args.shift_date}: ${empA.name} (${preview.employee_a.shift}) ↔ ${empB.name} (${preview.employee_b.shift})`,
    risk: "high",
    affected: [empA.name, empB.name],
    pending_action_id: paData.id, draft: preview, can_approve: true,
  }));

  return success({
    type: "action_preview", pending_action_id: paData.id,
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

// ─── Warnings ───

export async function listEmployeeWarnings(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) locationId = loc.id;
  }

  let employeeIds: string[] | null = null;
  if (args.employee_name) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(10);
    if (!emps?.length) return capabilityError(`No employees matching "${args.employee_name}"`);
    employeeIds = emps.map((e: any) => e.id);
  } else {
    // Scope to company via locations if no employee filter
    const { data: locs } = await sb.from("locations").select("id").eq("company_id", companyId);
    const locIds = (locs || []).map((l: any) => l.id);
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId);
    employeeIds = (emps || []).map((e: any) => e.id);
  }

  if (!employeeIds || employeeIds.length === 0) return success({ warnings: [], total: 0 });

  let q = sb.from("staff_events")
    .select("id, staff_id, event_type, event_date, description, metadata, created_at, location_id, employees(full_name), locations(name)")
    .in("staff_id", employeeIds)
    .in("event_type", ["warning", "coaching_note"])
    .order("event_date", { ascending: false })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.from) q = q.gte("event_date", args.from);
  if (args.to) q = q.lte("event_date", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    warnings: (data || []).map((w: any) => ({
      id: w.id,
      employee: w.employees?.full_name,
      type: w.event_type,
      date: w.event_date,
      description: w.description,
      severity: w.metadata?.severity || "minor",
      category: w.metadata?.category || null,
      location: w.locations?.name || null,
    })),
  });
}

export async function listStaffEvents(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let employeeIds: string[] | null = null;
  if (args.employee_name) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(10);
    if (!emps?.length) return capabilityError(`No employees matching "${args.employee_name}"`);
    employeeIds = emps.map((e: any) => e.id);
  } else {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId);
    employeeIds = (emps || []).map((e: any) => e.id);
  }

  if (!employeeIds || employeeIds.length === 0) return success({ events: [], total: 0 });

  const VALID_TYPES = ["warning", "coaching_note", "raise", "bonus", "promotion", "demotion", "termination"];
  let q = sb.from("staff_events")
    .select("id, staff_id, event_type, event_date, description, metadata, created_at, employees(full_name), locations(name)")
    .in("staff_id", employeeIds)
    .order("event_date", { ascending: false })
    .limit(limit);

  if (args.event_type && VALID_TYPES.includes(args.event_type)) q = q.eq("event_type", args.event_type);
  if (args.from) q = q.gte("event_date", args.from);
  if (args.to) q = q.lte("event_date", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    events: (data || []).map((e: any) => ({
      id: e.id,
      employee: e.employees?.full_name,
      type: e.event_type,
      date: e.event_date,
      description: e.description,
      metadata: e.metadata || {},
      location: e.locations?.name || null,
    })),
  });
}

export async function issueStaffEventDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve employee
  let empId = args.employee_id || null;
  let empName = args.employee_name;
  if (!empId && empName) {
    const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${empName}%`).limit(5);
    if (!emps?.length) return capabilityError(`Employee "${empName}" not found.`);
    if (emps.length > 1) return capabilityError(`Multiple employees match "${empName}": ${emps.map((e: any) => e.full_name).join(", ")}.`);
    empId = emps[0].id;
    empName = emps[0].full_name;
  }
  if (!empId) return capabilityError("Employee name is required.");

  const VALID_EVENT_TYPES = ["warning", "coaching_note", "raise", "bonus", "promotion", "demotion", "termination"];
  const eventType = VALID_EVENT_TYPES.includes(args.event_type) ? args.event_type : "warning";
  const severity = ["minor", "major", "critical"].includes(args.severity) ? args.severity : "minor";

  // Risk level depends on event type
  const HIGH_RISK_TYPES = ["warning", "demotion", "termination"];
  const riskLevel = HIGH_RISK_TYPES.includes(eventType) ? "high" : "medium";

  const draft: Record<string, any> = {
    staff_id: empId,
    employee_name: empName,
    event_type: eventType,
    description: args.description,
    notes: args.notes || null,
  };

  // Type-specific fields
  if (eventType === "warning" || eventType === "coaching_note") {
    draft.severity = severity;
    draft.category = args.category || null;
  }
  if (eventType === "raise" || eventType === "bonus") {
    draft.amount = args.amount || null;
    draft.effective_date = args.effective_date || null;
  }
  if (eventType === "promotion" || eventType === "demotion") {
    draft.new_role = args.new_role || null;
    draft.effective_date = args.effective_date || null;
  }
  if (eventType === "termination") {
    draft.termination_date = args.effective_date || null;
  }

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "issue_staff_event",
    action_type: "write", risk_level: riskLevel, preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  const actionLabel: Record<string, string> = {
    warning: "Issue Warning",
    coaching_note: "Issue Coaching Note",
    raise: "Issue Raise",
    bonus: "Issue Bonus",
    promotion: "Record Promotion",
    demotion: "Record Demotion",
    termination: "Record Termination",
  };

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: actionLabel[eventType] || "Record Staff Event",
    summary: `${actionLabel[eventType] || eventType} for ${empName}: ${args.description}`,
    risk: riskLevel,
    affected: [empName],
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({
    type: "staff_event_draft",
    draft,
    pending_action_id: paData.id,
    requires_approval: true,
    risk_level: riskLevel,
    message: `${actionLabel[eventType] || "Staff event"} draft ready for ${empName}. Approve to execute.`,
  });
}

// Keep backward-compatible alias
export const issueWarningDraft = issueStaffEventDraft;

export async function executeStaffEventIssuance(
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
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });

  // Build metadata from draft (exclude top-level fields that go in main columns)
  const { staff_id, employee_name, event_type, description, notes, ...extraFields } = d;
  const metadata: Record<string, any> = { ...extraFields };
  if (notes) metadata.notes = notes;

  const { data: evData, error: evError } = await sbService.from("staff_events").insert({
    staff_id: d.staff_id,
    event_type: d.event_type,
    event_date: today,
    description: d.description,
    metadata,
    created_by: userId,
  }).select("id").single();

  if (evError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: evError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Staff Event Failed", summary: evError.message }));
    return capabilityError(`Failed to record staff event: ${evError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, event_id: evData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  const actionLabel: Record<string, string> = {
    warning: "Warning Issued",
    coaching_note: "Coaching Note Issued",
    raise: "Raise Recorded",
    bonus: "Bonus Recorded",
    promotion: "Promotion Recorded",
    demotion: "Demotion Recorded",
    termination: "Termination Recorded",
  };

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: actionLabel[d.event_type] || "Staff Event Recorded",
    summary: `${d.event_type.replace("_", " ")} recorded for ${d.employee_name}.`,
  }));

  return success({ type: "staff_event_recorded", event_id: evData.id, message: `${d.event_type.replace("_", " ")} recorded for ${d.employee_name}.` });
}

// Keep backward-compatible alias
export const executeWarningIssuance = executeStaffEventIssuance;

// ─── Employee Dossier ───

export async function getEmployeeDossier(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Resolve employee
  let q = sb.from("employees").select("id, full_name, role, status, location_id, locations(name), hire_date, contract_type, email, phone").eq("company_id", companyId);
  if (args.employee_id) {
    q = q.eq("id", args.employee_id);
  } else if (args.employee_name) {
    q = q.ilike("full_name", `%${args.employee_name}%`).limit(3);
  } else {
    return capabilityError("Provide employee_name or employee_id.");
  }
  const { data: empData } = await q.limit(3);
  if (!empData?.length) return capabilityError(`Employee not found.`);
  if (empData.length > 1) return capabilityError(`Multiple employees match: ${empData.map((e: any) => e.full_name).join(", ")}. Be more specific.`);
  const emp = empData[0];

  // Parallel: recent attendance, warnings, CAs, training, last test
  const [attResult, warnResult, caResult, trainingResult, testResult] = await Promise.all([
    sb.from("attendance_logs").select("check_in_at, check_out_at, is_late").eq("staff_id", emp.id).order("check_in_at", { ascending: false }).limit(5),
    sb.from("staff_events").select("event_type, event_date, description, metadata").eq("staff_id", emp.id).eq("event_type", "warning").order("event_date", { ascending: false }).limit(5),
    sb.from("corrective_actions").select("id, title, severity, status, due_at").eq("owner_user_id", emp.id).in("status", ["open", "in_progress"]).limit(5),
    sb.from("training_assignments").select("id, status, training_programs(name), due_date").eq("employee_id", emp.id).order("created_at", { ascending: false }).limit(3),
    sb.from("test_submissions").select("score, passed, completed_at, tests(title)").eq("employee_id", emp.id).order("completed_at", { ascending: false }).limit(1),
  ]);

  return success({
    employee: {
      id: emp.id,
      name: emp.full_name,
      role: emp.role,
      status: emp.status,
      location: emp.locations?.name,
      hire_date: emp.hire_date,
      contract_type: emp.contract_type,
      email: emp.email,
      phone: emp.phone,
    },
    recent_attendance: (attResult.data || []).map((a: any) => ({
      check_in: a.check_in_at, check_out: a.check_out_at, is_late: a.is_late,
    })),
    active_warning_count: warnResult.data?.length ?? 0,
    recent_warnings: (warnResult.data || []).slice(0, 3).map((w: any) => ({
      date: w.event_date, description: w.description, severity: w.metadata?.severity,
    })),
    open_corrective_actions: (caResult.data || []).map((ca: any) => ({
      title: ca.title, severity: ca.severity, status: ca.status, due_at: ca.due_at,
    })),
    training: (trainingResult.data || []).map((t: any) => ({
      program: t.training_programs?.name, status: t.status, due_date: t.due_date,
    })),
    last_test: testResult.data?.[0] ? {
      test: testResult.data[0].tests?.title,
      score: testResult.data[0].score,
      passed: testResult.data[0].passed,
      completed_at: testResult.data[0].completed_at,
    } : null,
  });
}

// ─── Shift Publish/Unpublish ───

export async function publishShiftsDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (!locationId && locationName) {
    const { data: loc } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${locationName}".`);
    locationId = loc.id; locationName = loc.name;
  }

  const fromDate = args.from_date || args.shift_date || null;
  const toDate = args.to_date || args.shift_date || null;
  const doPublish = args.publish !== false;

  // Count affected shifts
  let q = sb.from("shifts").select("id", { count: "exact" }).eq("company_id", companyId);
  if (locationId) q = q.eq("location_id", locationId);
  if (fromDate) q = q.gte("shift_date", fromDate);
  if (toDate) q = q.lte("shift_date", toDate);
  const { count } = await q;

  const draft = { location_id: locationId, location_name: locationName, from_date: fromDate, to_date: toDate, publish: doPublish, shift_count: count || 0 };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId,
    action_name: doPublish ? "publish_shifts" : "unpublish_shifts",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: doPublish ? "Publish Shifts" : "Unpublish Shifts",
    summary: `${doPublish ? "Publish" : "Unpublish"} ${count || 0} shifts at ${locationName || "all locations"}${fromDate ? ` from ${fromDate}` : ""}${toDate && toDate !== fromDate ? ` to ${toDate}` : ""}`,
    risk: "medium",
    affected: [locationName, `${count || 0} shifts`].filter(Boolean),
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "publish_shifts_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executePublishShifts(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  let q = sbService.from("shifts").update({ is_published: d.publish, updated_at: new Date().toISOString() }).eq("company_id", companyId);
  if (d.location_id) q = q.eq("location_id", d.location_id);
  if (d.from_date) q = q.gte("shift_date", d.from_date);
  if (d.to_date) q = q.lte("shift_date", d.to_date);
  const { error } = await q;

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to ${d.publish ? "publish" : "unpublish"} shifts: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: d.publish ? "Shifts Published" : "Shifts Unpublished",
    summary: `${d.shift_count || "All"} shifts ${d.publish ? "published" : "unpublished"} at ${d.location_name || "all locations"}.`,
  }));

  return success({ type: "shifts_published", message: `Shifts ${d.publish ? "published" : "unpublished"} successfully.` });
}

// ─── Manual Clock-In ───

export async function manualClockInDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve employee
  let empId = args.employee_id || null;
  let empName = args.employee_name;
  if (!empId && empName) {
    const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${empName}%`).limit(5);
    if (!emps?.length) return capabilityError(`Employee "${empName}" not found.`);
    if (emps.length > 1) return capabilityError(`Multiple employees match "${empName}": ${emps.map((e: any) => e.full_name).join(", ")}.`);
    empId = emps[0].id; empName = emps[0].full_name;
  }
  if (!empId) return capabilityError("Employee name is required.");

  // Resolve location
  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (!locationId && locationName) {
    const { data: loc } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1).maybeSingle();
    if (loc) { locationId = loc.id; locationName = loc.name; }
  }

  // Resolve check_in_time: if just HH:MM, prepend today
  const todayBucharest = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  let checkIn = args.check_in_time;
  if (checkIn && /^\d{2}:\d{2}$/.test(checkIn)) {
    checkIn = `${todayBucharest}T${checkIn}:00`;
  }
  let checkOut = args.check_out_time || null;
  if (checkOut && /^\d{2}:\d{2}$/.test(checkOut)) {
    checkOut = `${todayBucharest}T${checkOut}:00`;
  }

  const draft = { staff_id: empId, employee_name: empName, location_id: locationId, location_name: locationName, check_in_time: checkIn, check_out_time: checkOut, reason: args.reason || "Manual entry" };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "manual_clock_in",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Manual Clock-In",
    summary: `Clock in ${empName} at ${locationName || "unknown location"} — ${checkIn}${checkOut ? ` to ${checkOut}` : ""}`,
    risk: "medium",
    affected: [empName, locationName].filter(Boolean),
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "manual_clock_in_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeManualClockIn(
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
  const { data: logData, error: logError } = await sbService.from("attendance_logs").insert({
    staff_id: d.staff_id,
    location_id: d.location_id,
    check_in_at: d.check_in_time,
    check_out_at: d.check_out_time || null,
    method: "manual",
    notes: d.reason,
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }).select("id").single();

  if (logError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: logError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create attendance entry: ${logError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, log_id: logData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Attendance Entry Created",
    summary: `Manual clock-in recorded for ${d.employee_name} at ${d.check_in_time}.`,
  }));

  return success({ type: "clock_in_created", log_id: logData.id, message: `Manual attendance entry created for ${d.employee_name}.` });
}
