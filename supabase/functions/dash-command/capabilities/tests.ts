/**
 * Tests & Assessments Capability Module
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

export async function listTests(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  let q = sb.from("tests")
    .select("id, title, description, is_active, passing_score, time_limit_minutes, scheduled_for, expires_at, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.active_only !== false) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    tests: (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      is_active: t.is_active,
      passing_score: t.passing_score,
      time_limit_minutes: t.time_limit_minutes,
      scheduled_for: t.scheduled_for,
      expires_at: t.expires_at,
    })),
  });
}

export async function getTestResults(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Resolve test if name given
  let testId = args.test_id || null;
  if (!testId && args.test_name) {
    const { data: tests } = await sb.from("tests").select("id, title").eq("company_id", companyId).ilike("title", `%${args.test_name}%`).limit(5);
    if (!tests?.length) return capabilityError(`No test matching "${args.test_name}".`);
    if (tests.length > 1 && !args.test_id) testId = tests[0].id; // take first match
    else testId = tests[0].id;
  }

  // Resolve employee if name given
  let employeeIds: string[] | null = null;
  if (args.employee_name) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(10);
    if (!emps?.length) return capabilityError(`No employees matching "${args.employee_name}".`);
    employeeIds = emps.map((e: any) => e.id);
  }

  // Scope to company employees
  if (!employeeIds) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId);
    employeeIds = (emps || []).map((e: any) => e.id);
  }

  let q = sb.from("test_submissions")
    .select("id, test_id, employee_id, score, passed, time_taken_minutes, completed_at, tests(title), employees(full_name)")
    .in("employee_id", employeeIds)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (testId) q = q.eq("test_id", testId);
  if (args.from) q = q.gte("completed_at", args.from);
  if (args.to) q = q.lte("completed_at", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    results: (data || []).map((r: any) => ({
      test: r.tests?.title,
      employee: r.employees?.full_name,
      score: r.score,
      passed: r.passed,
      time_taken_minutes: r.time_taken_minutes,
      completed_at: r.completed_at,
    })),
  });
}

export async function listTestAssignments(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Resolve employee scope
  let employeeFilter: string[] | null = null;
  if (args.employee_name) {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId).ilike("full_name", `%${args.employee_name}%`).limit(10);
    if (!emps?.length) return capabilityError(`No employees matching "${args.employee_name}".`);
    employeeFilter = emps.map((e: any) => e.id);
  } else {
    const { data: emps } = await sb.from("employees").select("id").eq("company_id", companyId);
    employeeFilter = (emps || []).map((e: any) => e.id);
  }

  // Resolve test if name given
  let testId = args.test_id || null;
  if (!testId && args.test_name) {
    const { data: tests } = await sb.from("tests").select("id").eq("company_id", companyId).ilike("title", `%${args.test_name}%`).limit(1);
    if (tests?.[0]) testId = tests[0].id;
  }

  let q = sb.from("test_assignments")
    .select("id, test_id, employee_id, completed, assigned_at, tests(title), employees(full_name)")
    .in("employee_id", employeeFilter)
    .order("assigned_at", { ascending: false })
    .limit(limit);

  if (testId) q = q.eq("test_id", testId);
  if (args.completed !== undefined) q = q.eq("completed", args.completed);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    assignments: (data || []).map((a: any) => ({
      test: a.tests?.title,
      employee: a.employees?.full_name,
      completed: a.completed,
      assigned_at: a.assigned_at,
    })),
  });
}

export async function assignTestDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve test
  let testId = args.test_id || null;
  let testTitle = args.test_name || null;
  if (!testId && testTitle) {
    const { data: tests } = await sb.from("tests").select("id, title").eq("company_id", companyId).ilike("title", `%${testTitle}%`).limit(5);
    if (!tests?.length) return capabilityError(`No test matching "${testTitle}".`);
    if (tests.length > 1) return capabilityError(`Multiple tests match "${testTitle}": ${tests.map((t: any) => t.title).join(", ")}. Be more specific.`);
    testId = tests[0].id; testTitle = tests[0].title;
  }
  if (!testId) return capabilityError("Test name or ID is required.");

  // Resolve employee
  let empId = args.employee_id || null;
  let empName = args.employee_name;
  if (!empId && empName) {
    const { data: emps } = await sb.from("employees").select("id, full_name").eq("company_id", companyId).ilike("full_name", `%${empName}%`).limit(5);
    if (!emps?.length) return capabilityError(`Employee "${empName}" not found.`);
    if (emps.length > 1) return capabilityError(`Multiple employees match "${empName}": ${emps.map((e: any) => e.full_name).join(", ")}.`);
    empId = emps[0].id; empName = emps[0].full_name;
  }
  if (!empId) return capabilityError("Employee name or ID is required.");

  const draft = { test_id: testId, test_title: testTitle, employee_id: empId, employee_name: empName };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "assign_test",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Assign Test",
    summary: `Assign "${testTitle}" to ${empName}`,
    risk: "medium",
    affected: [empName, testTitle],
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "test_assignment_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeTestAssignment(
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
  const { data: assignData, error: assignError } = await sbService.from("test_assignments").insert({
    test_id: d.test_id,
    employee_id: d.employee_id,
    assigned_by: userId,
    assigned_at: new Date().toISOString(),
    completed: false,
  }).select("id").single();

  if (assignError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: assignError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "Test Assignment Failed", summary: assignError.message }));
    return capabilityError(`Failed to assign test: ${assignError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, assignment_id: assignData.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Test Assigned",
    summary: `"${d.test_title}" has been assigned to ${d.employee_name}.`,
  }));

  return success({ type: "test_assigned", assignment_id: assignData.id, message: `Test "${d.test_title}" assigned to ${d.employee_name}.` });
}
