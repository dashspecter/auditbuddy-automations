/**
 * Time-Off Capability Module — Reference Implementation
 * 
 * All time-off domain logic lives here: reads and actions.
 * Every function returns CapabilityResult<T>.
 * No inline DB queries in index.ts — Dash calls these capabilities.
 * 
 * Mirrors and centralizes logic from:
 * - src/pages/staff/StaffTimeOff.tsx (balance calc, request creation)
 * - src/components/staff/PendingApprovalsSection.tsx (pending approvals)
 * - src/components/workforce/AddTimeOffDialog.tsx (manager-created time-off)
 * - src/pages/workforce/TimeOffApprovals.tsx (approve/reject)
 */

import { type CapabilityResult, success, validationError, permissionDenied, notFound, conflict, capabilityError, resultToToolResponse } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission, isManagerLevel, isHRLevel } from "../shared/permissions.ts";
import { validateDateRange, calculateDays, checkOverlap, checkBalance, validateRequestType } from "../shared/validation.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { TIME_OFF_STATUS, DEFAULT_ANNUAL_VACATION_DAYS, MODULE_CODES } from "../shared/constants.ts";

const MODULE = MODULE_CODES.WORKFORCE;

// ─── DOMAIN TYPES ───

export interface TimeOffBalance {
  employee_id: string;
  employee_name: string;
  total: number;
  used: number;
  remaining: number;
  year: number;
}

export interface TimeOffRequestNormalized {
  id: string;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  days: number;
  request_type: string;
  status: string;
  reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface TimeOffConflictReport {
  employee_overlaps: any[];
  team_overlaps: any[];
  has_conflicts: boolean;
}

// ─── READ CAPABILITIES ───

/**
 * Get time-off balance for an employee.
 * Mirrors StaffTimeOff.tsx calculateBalance logic.
 */
export async function getTimeOffBalance(
  sb: any,
  ctx: PermissionContext,
  params: { employee_id?: string; employee_name?: string; year?: number }
): Promise<CapabilityResult<TimeOffBalance>> {
  const perm = checkCapabilityPermission({ action: "read", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve employee
  const emp = await resolveEmployee(sb, ctx.companyId, params.employee_id, params.employee_name);
  if (!emp) return notFound("employee", params.employee_id || params.employee_name);

  const year = params.year ?? new Date().getFullYear();
  const totalDays = emp.annual_vacation_days ?? DEFAULT_ANNUAL_VACATION_DAYS;
  const balance = await checkBalance(sb, emp.id, totalDays, 0, year);

  return success({
    employee_id: emp.id,
    employee_name: emp.full_name,
    total: balance.total,
    used: balance.used,
    remaining: balance.remaining,
    year,
  });
}

/**
 * List time-off requests with optional filters.
 */
export async function listTimeOffRequests(
  sb: any,
  ctx: PermissionContext,
  params: { employee_id?: string; employee_name?: string; status?: string; from?: string; to?: string; limit?: number }
): Promise<CapabilityResult<{ requests: TimeOffRequestNormalized[]; count: number }>> {
  const perm = checkCapabilityPermission({ action: "read", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve employee if specified
  let employeeId = params.employee_id;
  if (!employeeId && params.employee_name) {
    const emp = await resolveEmployee(sb, ctx.companyId, undefined, params.employee_name);
    if (emp) employeeId = emp.id;
    else return notFound("employee", params.employee_name);
  }

  const limit = Math.min(params.limit || 50, 200);
  let q = sb
    .from("time_off_requests")
    .select("id, employee_id, start_date, end_date, status, reason, request_type, rejection_reason, created_at, approved_by, approved_at, employees:employee_id(full_name)")
    .eq("company_id", ctx.companyId)
    .order("start_date", { ascending: false })
    .limit(limit);

  if (employeeId) q = q.eq("employee_id", employeeId);
  if (params.status) q = q.eq("status", params.status);
  if (params.from) q = q.gte("start_date", params.from);
  if (params.to) q = q.lte("end_date", params.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const requests: TimeOffRequestNormalized[] = (data ?? []).map((r: any) => ({
    id: r.id,
    employee_id: r.employee_id,
    employee_name: r.employees?.full_name ?? "Unknown",
    start_date: r.start_date,
    end_date: r.end_date,
    days: calculateDays(r.start_date, r.end_date),
    request_type: r.request_type ?? "vacation",
    status: r.status,
    reason: r.reason,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
    approved_by: r.approved_by,
    approved_at: r.approved_at,
  }));

  return success({ requests, count: requests.length }, { count: requests.length, truncated: (data ?? []).length >= limit });
}

/**
 * List pending time-off approvals (company-wide).
 * Mirrors PendingApprovalsSection.tsx query.
 */
export async function listPendingApprovals(
  sb: any,
  ctx: PermissionContext
): Promise<CapabilityResult<{ requests: (TimeOffRequestNormalized & { annual_vacation_days: number })[]; count: number }>> {
  const perm = checkCapabilityPermission({ action: "read", module: MODULE, ctx });
  if (!perm.ok) return perm;

  const { data, error } = await sb
    .from("time_off_requests")
    .select("id, employee_id, start_date, end_date, status, reason, request_type, created_at, employees:employee_id(full_name, annual_vacation_days)")
    .eq("company_id", ctx.companyId)
    .eq("status", TIME_OFF_STATUS.PENDING)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return capabilityError(error.message);

  const requests = (data ?? []).map((r: any) => ({
    id: r.id,
    employee_id: r.employee_id,
    employee_name: r.employees?.full_name ?? "Unknown",
    start_date: r.start_date,
    end_date: r.end_date,
    days: calculateDays(r.start_date, r.end_date),
    request_type: r.request_type ?? "vacation",
    status: r.status,
    reason: r.reason,
    rejection_reason: null,
    created_at: r.created_at,
    approved_by: null,
    approved_at: null,
    annual_vacation_days: r.employees?.annual_vacation_days ?? DEFAULT_ANNUAL_VACATION_DAYS,
  }));

  return success({ requests, count: requests.length });
}

/**
 * Check for time-off conflicts: employee overlaps + team overlaps.
 */
export async function checkTimeOffConflicts(
  sb: any,
  ctx: PermissionContext,
  params: { employee_id?: string; employee_name?: string; start_date: string; end_date: string }
): Promise<CapabilityResult<TimeOffConflictReport>> {
  const perm = checkCapabilityPermission({ action: "read", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve employee
  const emp = await resolveEmployee(sb, ctx.companyId, params.employee_id, params.employee_name);
  if (!emp) return notFound("employee", params.employee_id || params.employee_name);

  // Check employee's own overlaps
  const employeeOverlaps = await checkOverlap(sb, emp.id, params.start_date, params.end_date);

  // Check team overlaps (same location, same dates)
  let teamOverlaps: any[] = [];
  if (emp.location_id) {
    const { data: teamData } = await sb
      .from("time_off_requests")
      .select("id, employee_id, start_date, end_date, status, request_type, employees:employee_id(full_name)")
      .eq("company_id", ctx.companyId)
      .in("status", [TIME_OFF_STATUS.APPROVED, TIME_OFF_STATUS.PENDING])
      .lte("start_date", params.end_date)
      .gte("end_date", params.start_date)
      .neq("employee_id", emp.id)
      .limit(50);

    // Filter to same location
    if (teamData) {
      const { data: locationEmps } = await sb
        .from("employees")
        .select("id")
        .eq("location_id", emp.location_id)
        .eq("status", "active");
      const locationEmpIds = new Set((locationEmps ?? []).map((e: any) => e.id));
      teamOverlaps = teamData
        .filter((r: any) => locationEmpIds.has(r.employee_id))
        .map((r: any) => ({
          id: r.id,
          employee_name: r.employees?.full_name ?? "Unknown",
          start_date: r.start_date,
          end_date: r.end_date,
          request_type: r.request_type,
          status: r.status,
        }));
    }
  }

  return success({
    employee_overlaps: employeeOverlaps,
    team_overlaps: teamOverlaps,
    has_conflicts: employeeOverlaps.length > 0 || teamOverlaps.length > 0,
  });
}

/**
 * Get team time-off calendar: who is off in a date range.
 */
export async function getTeamTimeOffCalendar(
  sb: any,
  ctx: PermissionContext,
  params: { location_id?: string; location_name?: string; from: string; to: string }
): Promise<CapabilityResult<{ entries: any[]; count: number }>> {
  const perm = checkCapabilityPermission({ action: "read", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve location if name provided
  let locationId = params.location_id;
  if (!locationId && params.location_name) {
    const { data: locData } = await sb
      .from("locations")
      .select("id, name")
      .eq("company_id", ctx.companyId)
      .ilike("name", `%${params.location_name}%`)
      .limit(1);
    if (locData?.[0]) locationId = locData[0].id;
  }

  let q = sb
    .from("time_off_requests")
    .select("id, employee_id, start_date, end_date, request_type, status, employees:employee_id(full_name, location_id, locations:location_id(name))")
    .eq("company_id", ctx.companyId)
    .eq("status", TIME_OFF_STATUS.APPROVED)
    .lte("start_date", params.to)
    .gte("end_date", params.from)
    .order("start_date", { ascending: true })
    .limit(200);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  let entries = (data ?? []).map((r: any) => ({
    id: r.id,
    employee_name: r.employees?.full_name ?? "Unknown",
    location: r.employees?.locations?.name ?? "Unknown",
    location_id: r.employees?.location_id,
    start_date: r.start_date,
    end_date: r.end_date,
    days: calculateDays(r.start_date, r.end_date),
    request_type: r.request_type ?? "vacation",
  }));

  // Filter by location if specified
  if (locationId) {
    entries = entries.filter((e: any) => e.location_id === locationId);
  }

  return success({ entries, count: entries.length });
}

// ─── ACTION CAPABILITIES ───

/**
 * Create a time-off request.
 * Mirrors AddTimeOffDialog.tsx + StaffTimeOff.tsx creation logic.
 * Manager/admin/HR → auto-approved. Employee → pending.
 */
export async function createTimeOffRequest(
  sb: any,
  sbService: any,
  ctx: PermissionContext,
  params: {
    employee_id?: string;
    employee_name?: string;
    start_date: string;
    end_date: string;
    request_type: string;
    reason?: string;
  }
): Promise<CapabilityResult<{ request_id: string; status: string; employee_name: string; days: number }>> {
  const perm = checkCapabilityPermission({ action: "create", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve employee
  const emp = await resolveEmployee(sb, ctx.companyId, params.employee_id, params.employee_name);
  if (!emp) return notFound("employee", params.employee_id || params.employee_name);

  // Validate request type
  const typeError = validateRequestType(params.request_type);
  if (typeError) return validationError([typeError]);

  // Validate dates (allow past for managers creating retroactive records)
  const dateErrors = validateDateRange(params.start_date, params.end_date, { allowPast: isManagerLevel(ctx) });
  if (dateErrors.length > 0) return validationError(dateErrors);

  const days = calculateDays(params.start_date, params.end_date);

  // Check balance for vacation type
  if (params.request_type === "vacation") {
    const totalDays = emp.annual_vacation_days ?? DEFAULT_ANNUAL_VACATION_DAYS;
    const balance = await checkBalance(sb, emp.id, totalDays, days);
    if (!balance.sufficient) {
      return validationError([`Insufficient vacation balance. ${emp.full_name} has ${balance.remaining} days remaining but the request is for ${days} days.`]);
    }
  }

  // Check overlaps
  const overlaps = await checkOverlap(sb, emp.id, params.start_date, params.end_date);
  if (overlaps.length > 0) {
    const overlapDates = overlaps.map((o: any) => `${o.start_date} to ${o.end_date} (${o.status})`).join(", ");
    return conflict(`${emp.full_name} already has overlapping time-off requests: ${overlapDates}`);
  }

  // Determine status: managers auto-approve, employees → pending
  const isManager = isHRLevel(ctx);
  const status = isManager ? TIME_OFF_STATUS.APPROVED : TIME_OFF_STATUS.PENDING;

  const insertData: any = {
    employee_id: emp.id,
    company_id: ctx.companyId,
    start_date: params.start_date,
    end_date: params.end_date,
    request_type: params.request_type,
    reason: params.reason || null,
    status,
    rejection_reason: null,
  };

  if (status === TIME_OFF_STATUS.APPROVED) {
    insertData.approved_by = ctx.actorUserId;
    insertData.approved_at = new Date().toISOString();
  }

  const { data, error } = await sbService
    .from("time_off_requests")
    .insert(insertData)
    .select("id")
    .single();

  if (error) return capabilityError(`Failed to create time-off request: ${error.message}`);

  await logCapabilityAction(sbService, {
    companyId: ctx.companyId,
    userId: ctx.actorUserId,
    capability: "time_off.create",
    actionType: "write",
    riskLevel: "medium",
    request: params,
    result: { request_id: data.id, status },
    entitiesAffected: [data.id, emp.id],
    module: MODULE,
  });

  return success({
    request_id: data.id,
    status,
    employee_name: emp.full_name,
    days,
  });
}

/**
 * Approve a pending time-off request.
 */
export async function approveTimeOffRequest(
  sb: any,
  sbService: any,
  ctx: PermissionContext,
  params: { request_id?: string; employee_name?: string }
): Promise<CapabilityResult<{ request_id: string; employee_name: string; status: string }>> {
  const perm = checkCapabilityPermission({ action: "approve", module: MODULE, ctx });
  if (!perm.ok) return perm;

  // Resolve request
  const request = await resolveRequest(sb, ctx.companyId, params.request_id, params.employee_name);
  if (!request) return notFound("time_off_request", params.request_id || params.employee_name);

  if (request.status !== TIME_OFF_STATUS.PENDING) {
    return validationError([`Cannot approve: request is already "${request.status}".`]);
  }

  const { error } = await sbService
    .from("time_off_requests")
    .update({
      status: TIME_OFF_STATUS.APPROVED,
      approved_by: ctx.actorUserId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("company_id", ctx.companyId);

  if (error) return capabilityError(`Failed to approve: ${error.message}`);

  await logCapabilityAction(sbService, {
    companyId: ctx.companyId,
    userId: ctx.actorUserId,
    capability: "time_off.approve",
    actionType: "write",
    riskLevel: "medium",
    request: params,
    result: { request_id: request.id, status: TIME_OFF_STATUS.APPROVED },
    entitiesAffected: [request.id],
    module: MODULE,
  });

  return success({
    request_id: request.id,
    employee_name: request.employee_name,
    status: TIME_OFF_STATUS.APPROVED,
  });
}

/**
 * Reject a pending time-off request.
 */
export async function rejectTimeOffRequest(
  sb: any,
  sbService: any,
  ctx: PermissionContext,
  params: { request_id?: string; employee_name?: string; rejection_reason?: string }
): Promise<CapabilityResult<{ request_id: string; employee_name: string; status: string }>> {
  const perm = checkCapabilityPermission({ action: "reject", module: MODULE, ctx });
  if (!perm.ok) return perm;

  const request = await resolveRequest(sb, ctx.companyId, params.request_id, params.employee_name);
  if (!request) return notFound("time_off_request", params.request_id || params.employee_name);

  if (request.status !== TIME_OFF_STATUS.PENDING) {
    return validationError([`Cannot reject: request is already "${request.status}".`]);
  }

  const { error } = await sbService
    .from("time_off_requests")
    .update({
      status: TIME_OFF_STATUS.REJECTED,
      rejection_reason: params.rejection_reason || null,
      approved_by: ctx.actorUserId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("company_id", ctx.companyId);

  if (error) return capabilityError(`Failed to reject: ${error.message}`);

  await logCapabilityAction(sbService, {
    companyId: ctx.companyId,
    userId: ctx.actorUserId,
    capability: "time_off.reject",
    actionType: "write",
    riskLevel: "medium",
    request: params,
    result: { request_id: request.id, status: TIME_OFF_STATUS.REJECTED },
    entitiesAffected: [request.id],
    module: MODULE,
  });

  return success({
    request_id: request.id,
    employee_name: request.employee_name,
    status: TIME_OFF_STATUS.REJECTED,
  });
}

/**
 * Cancel a time-off request.
 * Employee can cancel own pending/approved. Manager can cancel any.
 */
export async function cancelTimeOffRequest(
  sb: any,
  sbService: any,
  ctx: PermissionContext,
  params: { request_id: string }
): Promise<CapabilityResult<{ request_id: string; employee_name: string; deleted: boolean }>> {
  const perm = checkCapabilityPermission({ action: "cancel", module: MODULE, ctx });
  if (!perm.ok) return perm;

  const { data: request, error: fetchError } = await sb
    .from("time_off_requests")
    .select("id, employee_id, status, company_id, employees:employee_id(full_name, user_id)")
    .eq("id", params.request_id)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (fetchError || !request) return notFound("time_off_request", params.request_id);

  // Check ownership: employee can cancel own, manager can cancel any
  const isOwner = request.employees?.user_id === ctx.actorUserId;
  if (!isOwner && !isManagerLevel(ctx)) {
    return permissionDenied("You can only cancel your own time-off requests.");
  }

  if (!["pending", "approved"].includes(request.status)) {
    return validationError([`Cannot cancel: request is already "${request.status}".`]);
  }

  // Delete the request (matching current platform behavior)
  const { error } = await sbService
    .from("time_off_requests")
    .delete()
    .eq("id", request.id)
    .eq("company_id", ctx.companyId);

  if (error) return capabilityError(`Failed to cancel: ${error.message}`);

  await logCapabilityAction(sbService, {
    companyId: ctx.companyId,
    userId: ctx.actorUserId,
    capability: "time_off.cancel",
    actionType: "write",
    riskLevel: "medium",
    request: params,
    result: { request_id: request.id, deleted: true },
    entitiesAffected: [request.id],
    module: MODULE,
  });

  return success({
    request_id: request.id,
    employee_name: request.employees?.full_name ?? "Unknown",
    deleted: true,
  });
}

// ─── INTERNAL HELPERS ───

/**
 * Resolve an employee by ID or name within a company.
 */
async function resolveEmployee(
  sb: any,
  companyId: string,
  employeeId?: string,
  employeeName?: string
): Promise<any | null> {
  if (employeeId) {
    const { data } = await sb
      .from("employees")
      .select("id, full_name, annual_vacation_days, location_id, user_id, status")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle();
    return data;
  }
  if (employeeName) {
    const { data } = await sb
      .from("employees")
      .select("id, full_name, annual_vacation_days, location_id, user_id, status")
      .eq("company_id", companyId)
      .ilike("full_name", `%${employeeName}%`)
      .limit(1);
    return data?.[0] ?? null;
  }
  return null;
}

/**
 * Resolve a time-off request by ID or employee name (most recent pending).
 */
async function resolveRequest(
  sb: any,
  companyId: string,
  requestId?: string,
  employeeName?: string
): Promise<{ id: string; status: string; employee_name: string; employee_id: string } | null> {
  if (requestId) {
    const { data } = await sb
      .from("time_off_requests")
      .select("id, status, employee_id, employees:employee_id(full_name)")
      .eq("id", requestId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!data) return null;
    return { id: data.id, status: data.status, employee_name: data.employees?.full_name ?? "Unknown", employee_id: data.employee_id };
  }
  if (employeeName) {
    // Find employee first, then their most recent pending request
    const emp = await resolveEmployee(sb, companyId, undefined, employeeName);
    if (!emp) return null;
    const { data } = await sb
      .from("time_off_requests")
      .select("id, status")
      .eq("employee_id", emp.id)
      .eq("company_id", companyId)
      .eq("status", TIME_OFF_STATUS.PENDING)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data?.[0]) return null;
    return { id: data[0].id, status: data[0].status, employee_name: emp.full_name, employee_id: emp.id };
  }
  return null;
}
