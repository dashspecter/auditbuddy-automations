/**
 * Workforce Capability Module
 * Migrated from index.ts — employees, shifts, attendance domain logic.
 */
import { DEFAULT_TIMEZONE } from "../shared/constants.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function searchEmployees(
  sb: any, companyId: string, args: any
): Promise<any> {
  const limit = Math.min(args.limit || 10, MAX_TOOL_ROWS);
  const term = `%${args.query}%`;
  const { data, error } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)")
    .eq("company_id", companyId).or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`).limit(limit);
  if (error) return { error: error.message };
  return { count: data?.length ?? 0, employees: data?.map((e: any) => ({ id: e.id, name: e.full_name, role: e.role, status: e.status, location: e.locations?.name })) };
}

export async function getAttendanceExceptions(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<any> {
  const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
  const ur = await utcRange(sb, args.from, args.to);
  if (!ur) return { error: "Failed to convert date range" };
  let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
    .gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc)
    .or("is_late.eq.true,check_out_at.is.null").order("check_in_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  const { data, error } = await q;
  if (error) return { error: error.message };
  const c = cap(data, limit);
  return { ...c, exceptions: c.items.map((l: any) => ({ id: l.id, employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at, is_late: l.is_late, late_minutes: l.late_minutes, auto_clocked_out: l.auto_clocked_out, location: l.locations?.name })) };
}

// ─── Draft Tools ───

export async function createEmployeeDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[]
): Promise<any> {
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

export async function createShiftDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[]
): Promise<any> {
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
      return { action: "Create Shift", summary: `Multiple employees match "${args.employee_name}". Please select one.`, risk: "medium", can_approve: false, missing_fields: ["employee"], requires_approval: true, message: `Found ${empData.length} employees matching "${args.employee_name}". Please clarify.` };
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

// ─── Execute Tools ───

export async function executeEmployeeCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  hydrateArgsFromDraft: (actionName: string, previewJson: any) => Record<string, any>
): Promise<any> {
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
    const { data: pa } = await sbService.from("dash_pending_actions")
      .select("id, status, company_id")
      .eq("id", args.pending_action_id)
      .maybeSingle();
    if (pa && pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
    if (pa && pa.status !== "pending") return { error: `Action already ${pa.status}.` };
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
    return { error: `Failed to create employee: ${empError.message}` };
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

export async function executeShiftCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[]
): Promise<any> {
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
