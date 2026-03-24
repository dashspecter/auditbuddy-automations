/**
 * Operations Capability Module
 * Grouped smaller domains: Tasks, CMMS, Documents, Training.
 * Phase 8: Standardized on CapabilityResult.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { cap } from "../shared/utils.ts";


export async function getTaskCompletionSummary(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let q = sb.from("task_completions").select("id, completed_at, task_id, tasks(title, location_id, locations(name))").gte("completed_at", args.from).lte("completed_at", args.to + "T23:59:59Z");
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
