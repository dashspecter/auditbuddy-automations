/**
 * Shared validation utilities for Dash capability layer.
 * Mirrors and centralizes validation logic from the frontend
 * (StaffTimeOff.tsx, AddTimeOffDialog.tsx, etc.)
 */

import { TIME_OFF_STATUS, VALID_TIME_OFF_TYPES } from "./constants.ts";

/**
 * Validate a date range.
 * Returns array of error strings (empty = valid).
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  options?: { allowPast?: boolean }
): string[] {
  const errors: string[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) errors.push("Invalid start date format. Use YYYY-MM-DD.");
  if (isNaN(end.getTime())) errors.push("Invalid end date format. Use YYYY-MM-DD.");
  
  if (errors.length > 0) return errors;
  
  if (end < start) {
    errors.push("End date must be on or after start date.");
  }
  
  if (!options?.allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Allow today but not past dates
    if (start < today) {
      errors.push("Start date cannot be in the past.");
    }
  }
  
  return errors;
}

/**
 * Calculate the number of calendar days (inclusive) between two dates.
 * Mirrors StaffTimeOff.tsx lines 101-106.
 */
export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Check for overlapping time-off requests for an employee.
 * Returns overlapping requests or empty array.
 */
export async function checkOverlap(
  sb: any,
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeRequestId?: string
): Promise<any[]> {
  let q = sb
    .from("time_off_requests")
    .select("id, start_date, end_date, status, request_type")
    .eq("employee_id", employeeId)
    .in("status", [TIME_OFF_STATUS.APPROVED, TIME_OFF_STATUS.PENDING])
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  
  if (excludeRequestId) {
    q = q.neq("id", excludeRequestId);
  }
  
  const { data, error } = await q;
  if (error) {
    console.error("[validation] checkOverlap error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Check leave balance for an employee.
 * Returns { total, used, remaining, sufficient }.
 */
export async function checkBalance(
  sb: any,
  employeeId: string,
  totalDays: number,
  newRequestDays: number,
  year?: number
): Promise<{ total: number; used: number; remaining: number; sufficient: boolean }> {
  const currentYear = year ?? new Date().getFullYear();
  
  const { data } = await sb
    .from("time_off_requests")
    .select("start_date, end_date")
    .eq("employee_id", employeeId)
    .eq("status", TIME_OFF_STATUS.APPROVED)
    .gte("start_date", `${currentYear}-01-01`)
    .lte("end_date", `${currentYear}-12-31`);
  
  const used = (data ?? []).reduce((total: number, req: any) => {
    return total + calculateDays(req.start_date, req.end_date);
  }, 0);
  
  const remaining = totalDays - used;
  
  return {
    total: totalDays,
    used,
    remaining,
    sufficient: remaining >= newRequestDays,
  };
}

/**
 * Validate request type is one of the allowed values.
 */
export function validateRequestType(requestType: string): string | null {
  if (!VALID_TIME_OFF_TYPES.includes(requestType as any)) {
    return `Invalid request type "${requestType}". Allowed: ${VALID_TIME_OFF_TYPES.join(", ")}`;
  }
  return null;
}
