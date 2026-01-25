import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default timezone for Dashspect
const DEFAULT_TIMEZONE = "Europe/Bucharest";
const MAX_TOOL_RESULT_ROWS = 200;

// ============= TIMEZONE HELPERS (using Postgres RPC for DST-safety) =============

/**
 * Get UTC timestamp range from local date range using Postgres RPC (DST-safe)
 */
async function getUTCDateRange(supabase: any, fromDate: string, toDate: string, tz: string = DEFAULT_TIMEZONE): Promise<{ fromUtc: string; toUtc: string } | null> {
  try {
    const { data, error } = await supabase.rpc('tz_date_range_to_utc', {
      from_date: fromDate,
      to_date: toDate,
      tz: tz
    });
    
    if (error || !data || data.length === 0) {
      console.error('Failed to get UTC date range:', error);
      return null;
    }
    
    return {
      fromUtc: data[0].from_utc,
      toUtc: data[0].to_utc
    };
  } catch (e) {
    console.error('UTC date range RPC failed:', e);
    return null;
  }
}

/**
 * Get local date from UTC timestamp using Postgres RPC (DST-safe)
 */
async function getLocalDate(supabase: any, timestamp: string, tz: string = DEFAULT_TIMEZONE): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('tz_timestamp_to_local_date', {
      ts: timestamp,
      tz: tz
    });
    
    if (error || data === null) {
      console.error('Failed to get local date:', error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Local date RPC failed:', e);
    return null;
  }
}

/**
 * Batch convert timestamps to local dates (more efficient)
 */
async function batchGetLocalDates(supabase: any, timestamps: string[], tz: string = DEFAULT_TIMEZONE): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  // Process in batches to avoid too many RPC calls
  for (const ts of timestamps) {
    const localDate = await getLocalDate(supabase, ts, tz);
    if (localDate) {
      result.set(ts, localDate);
    }
  }
  
  return result;
}

/**
 * Fallback: Get YYYY-MM-DD date key in the specified timezone using Intl (for when RPC fails)
 */
function getDateKeyInTZFallback(isoTimestamp: string, tz: string): string {
  try {
    const date = new Date(isoTimestamp);
    const formatter = new Intl.DateTimeFormat("en-CA", { 
      timeZone: tz, 
      year: "numeric", 
      month: "2-digit", 
      day: "2-digit" 
    });
    return formatter.format(date);
  } catch {
    return new Date(isoTimestamp).toISOString().split("T")[0];
  }
}

/**
 * Cap tool results to prevent token blowups
 */
function capResults<T>(data: T[] | null, limit: number = MAX_TOOL_RESULT_ROWS): { 
  items: T[]; 
  count_total: number; 
  count_returned: number; 
  truncated: boolean 
} {
  const items = data || [];
  const total = items.length;
  const truncated = total > limit;
  return {
    items: items.slice(0, limit),
    count_total: total,
    count_returned: Math.min(total, limit),
    truncated
  };
}

// Tool definitions for Lovable AI gateway
const tools = [
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "Search employees in user's company by name, phone, or email. Returns list of matching employees.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (name, phone, or email)" },
          limit: { type: "number", description: "Max results (default 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_employee_profile",
      description: "Get detailed profile for an employee. PII (phone, email) only shown if user is admin/manager.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          include_pii: { type: "boolean", description: "Request PII fields (phone, email). Only works for admin/manager." }
        },
        required: ["employee_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_shifts",
      description: "List shifts for an employee within a date range.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          to: { type: "string", description: "End date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          location_id: { type: "string", description: "Optional location UUID filter" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_attendance_logs",
      description: "List attendance/clock-in logs for an employee within a date range.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          to: { type: "string", description: "End date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          location_id: { type: "string", description: "Optional location UUID filter" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compute_hours_worked",
      description: "Compute total hours worked from attendance logs. Returns hours, daily breakdown, and anomalies.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          to: { type: "string", description: "End date (YYYY-MM-DD)" },
          timezone: { type: "string", description: "Timezone (default: Europe/Bucharest)" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compute_days_worked",
      description: "Count unique workdays from attendance logs.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          to: { type: "string", description: "End date (YYYY-MM-DD)" },
          timezone: { type: "string", description: "Timezone (default: Europe/Bucharest)" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compute_missed_shifts",
      description: "Find shifts where employee was assigned but did not check in (no attendance log linked and no approved time off).",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          to: { type: "string", description: "End date (YYYY-MM-DD)" },
          timezone: { type: "string", description: "Timezone (default: Europe/Bucharest)" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_warnings",
      description: "List warnings/discipline events for an employee within a date range.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          to: { type: "string", description: "End date (YYYY-MM-DD)" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "leave_balance",
      description: "Get leave/time-off balance for an employee (vacation days used, pending, approved).",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee" },
          year: { type: "number", description: "Year to check (default: current year)" }
        },
        required: ["employee_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "debug_employee_workforce_access",
      description: "Diagnostic tool to investigate data visibility issues. Use when data queries return 0 unexpectedly (e.g., '0 shifts' for an employee who should have shifts). Returns RLS visibility checks, sample rows, ID mismatch detection, and report source hints.",
      parameters: {
        type: "object",
        properties: {
          employee_id: { type: "string", description: "UUID of the employee to diagnose" },
          from: { type: "string", description: "Start date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          to: { type: "string", description: "End date (YYYY-MM-DD) in Europe/Bucharest timezone" },
          timezone: { type: "string", description: "Timezone (default: Europe/Bucharest)" }
        },
        required: ["employee_id", "from", "to"]
      }
    }
  }
];

// Tool execution functions
async function executeSearchEmployees(supabase: any, args: { query: string; limit?: number }) {
  const limit = Math.min(args.limit || 10, MAX_TOOL_RESULT_ROWS);
  const searchTerm = `%${args.query}%`;
  
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, role, status, location_id, locations(name)")
    .or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(limit);
  
  if (error) return { error: error.message };
  
  return {
    count: data?.length || 0,
    employees: data?.map((e: any) => ({
      employee_id: e.id,
      full_name: e.full_name,
      role: e.role,
      status: e.status,
      location: e.locations?.name || null
    })) || []
  };
}

async function executeGetEmployeeProfile(
  supabase: any, 
  args: { employee_id: string; include_pii?: boolean }, 
  dbRole: string
) {
  const canSeePii = (args.include_pii === true) && (dbRole === "admin" || dbRole === "manager" || dbRole === "company_admin" || dbRole === "company_owner");
  
  const selectFields = canSeePii 
    ? "id, full_name, role, status, phone, email, location_id, locations(name)"
    : "id, full_name, role, status, location_id, locations(name)";
  
  const { data, error } = await supabase
    .from("employees")
    .select(selectFields)
    .eq("id", args.employee_id)
    .single();
  
  if (error) return { error: error.message };
  if (!data) return { error: "Employee not found" };
  
  const result: any = {
    employee_id: data.id,
    full_name: data.full_name,
    role: data.role,
    status: data.status,
    location: data.locations?.name || null,
    pii_included: canSeePii
  };
  
  if (canSeePii) {
    result.phone = data.phone || null;
    result.email = data.email || null;
  } else if (args.include_pii) {
    result.pii_denied = true;
    result.pii_denied_reason = "Only admins and managers can view employee PII";
  }
  
  return result;
}

async function executeListShifts(supabase: any, args: { employee_id: string; from: string; to: string; location_id?: string }) {
  const tz = DEFAULT_TIMEZONE;
  
  // Use Postgres RPC for DST-safe date range conversion
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  if (!utcRange) {
    return { error: "Failed to convert date range to UTC" };
  }
  
  let query = supabase
    .from("shift_assignments")
    .select(`
      id,
      status,
      shifts!inner(id, start_time, end_time, location_id, locations(name))
    `)
    .eq("staff_id", args.employee_id)
    .gte("shifts.start_time", utcRange.fromUtc)
    .lt("shifts.start_time", utcRange.toUtc);
  
  if (args.location_id) {
    query = query.eq("shifts.location_id", args.location_id);
  }
  
  const { data, error } = await query.order("shifts(start_time)", { ascending: true });
  
  if (error) return { error: error.message };
  
  const capped = capResults(data);
  
  return {
    count_total: capped.count_total,
    count_returned: capped.count_returned,
    truncated: capped.truncated,
    timezone: tz,
    date_range: { from: args.from, to: args.to },
    shifts: capped.items.map((sa: any) => ({
      shift_id: sa.shifts?.id,
      assignment_id: sa.id,
      start_time: sa.shifts?.start_time,
      end_time: sa.shifts?.end_time,
      location: sa.shifts?.locations?.name || null,
      status: sa.status
    }))
  };
}

async function executeListAttendanceLogs(supabase: any, args: { employee_id: string; from: string; to: string; location_id?: string }) {
  const tz = DEFAULT_TIMEZONE;
  
  // Use Postgres RPC for DST-safe date range conversion
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  if (!utcRange) {
    return { error: "Failed to convert date range to UTC" };
  }
  
  let query = supabase
    .from("attendance_logs")
    .select("id, check_in_at, check_out_at, method, location_id, locations(name), shift_id, is_late, late_minutes, auto_clocked_out")
    .eq("staff_id", args.employee_id)
    .gte("check_in_at", utcRange.fromUtc)
    .lt("check_in_at", utcRange.toUtc);
  
  if (args.location_id) {
    query = query.eq("location_id", args.location_id);
  }
  
  const { data, error } = await query.order("check_in_at", { ascending: true });
  
  if (error) return { error: error.message };
  
  const capped = capResults(data);
  
  return {
    count_total: capped.count_total,
    count_returned: capped.count_returned,
    truncated: capped.truncated,
    timezone: tz,
    date_range: { from: args.from, to: args.to },
    logs: capped.items.map((log: any) => ({
      id: log.id,
      check_in_at: log.check_in_at,
      check_out_at: log.check_out_at,
      method: log.method,
      location: log.locations?.name || null,
      shift_id: log.shift_id,
      is_late: log.is_late,
      late_minutes: log.late_minutes,
      auto_clocked_out: log.auto_clocked_out
    }))
  };
}

async function executeComputeHoursWorked(supabase: any, args: { employee_id: string; from: string; to: string; timezone?: string }) {
  const tz = args.timezone || DEFAULT_TIMEZONE;
  
  // Use Postgres RPC for DST-safe date range conversion
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  if (!utcRange) {
    return { error: "Failed to convert date range to UTC" };
  }
  
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("id, check_in_at, check_out_at")
    .eq("staff_id", args.employee_id)
    .gte("check_in_at", utcRange.fromUtc)
    .lt("check_in_at", utcRange.toUtc)
    .order("check_in_at", { ascending: true });
  
  if (error) return { error: error.message };
  
  const capped = capResults(data);
  
  const anomalies: any[] = [];
  const dailyMinutes: Record<string, { minutes: number; sessions: number }> = {};
  let totalMinutes = 0;
  
  // Get local dates for all check-in timestamps using RPC
  const timestamps = (capped.items as any[]).map(log => log.check_in_at);
  const localDates = await batchGetLocalDates(supabase, timestamps, tz);
  
  for (const log of capped.items as any[]) {
    // Use RPC result or fallback to Intl
    const dateKey = localDates.get(log.check_in_at) || getDateKeyInTZFallback(log.check_in_at, tz);
    
    if (!dailyMinutes[dateKey]) {
      dailyMinutes[dateKey] = { minutes: 0, sessions: 0 };
    }
    
    if (!log.check_out_at) {
      anomalies.push({
        type: "missing_checkout",
        log_id: log.id,
        date: dateKey,
        check_in_at: log.check_in_at
      });
      dailyMinutes[dateKey].sessions++;
    } else {
      const checkIn = new Date(log.check_in_at);
      const checkOut = new Date(log.check_out_at);
      const minutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
      totalMinutes += minutes;
      dailyMinutes[dateKey].minutes += minutes;
      dailyMinutes[dateKey].sessions++;
    }
  }
  
  return {
    timezone: tz,
    date_range: { from: args.from, to: args.to },
    total_minutes: totalMinutes,
    total_hours: Math.round(totalMinutes / 60 * 100) / 100,
    logs_analyzed: capped.count_total,
    logs_returned: capped.count_returned,
    truncated: capped.truncated,
    days: Object.entries(dailyMinutes).map(([date, stats]) => ({
      date,
      minutes: stats.minutes,
      hours: Math.round(stats.minutes / 60 * 100) / 100,
      sessions: stats.sessions
    })),
    anomalies
  };
}

async function executeComputeDaysWorked(supabase: any, args: { employee_id: string; from: string; to: string; timezone?: string }) {
  const tz = args.timezone || DEFAULT_TIMEZONE;
  
  // Use Postgres RPC for DST-safe date range conversion
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  if (!utcRange) {
    return { error: "Failed to convert date range to UTC" };
  }
  
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("check_in_at")
    .eq("staff_id", args.employee_id)
    .gte("check_in_at", utcRange.fromUtc)
    .lt("check_in_at", utcRange.toUtc);
  
  if (error) return { error: error.message };
  
  const capped = capResults(data);
  
  // Get local dates for all check-in timestamps using RPC
  const timestamps = (capped.items as any[]).map(log => log.check_in_at);
  const localDates = await batchGetLocalDates(supabase, timestamps, tz);
  
  const uniqueDates = new Set<string>();
  for (const log of capped.items as any[]) {
    const date = localDates.get(log.check_in_at) || getDateKeyInTZFallback(log.check_in_at, tz);
    uniqueDates.add(date);
  }
  
  const sortedDates = Array.from(uniqueDates).sort();
  
  return {
    timezone: tz,
    date_range: { from: args.from, to: args.to },
    days_worked: sortedDates.length,
    dates: sortedDates,
    logs_analyzed: capped.count_total,
    logs_returned: capped.count_returned,
    truncated: capped.truncated
  };
}

async function executeComputeMissedShifts(supabase: any, args: { employee_id: string; from: string; to: string; timezone?: string }) {
  const tz = args.timezone || DEFAULT_TIMEZONE;
  
  // Use Postgres RPC for DST-safe date range conversion
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  if (!utcRange) {
    return { error: "Failed to convert date range to UTC" };
  }
  
  // Get all assigned shifts in range
  const { data: assignedShifts, error: shiftsError } = await supabase
    .from("shift_assignments")
    .select(`
      id,
      status,
      shifts!inner(id, start_time, end_time, shift_date, location_id, locations(name))
    `)
    .eq("staff_id", args.employee_id)
    .eq("approval_status", "approved")
    .gte("shifts.start_time", utcRange.fromUtc)
    .lt("shifts.start_time", utcRange.toUtc)
    .order("shifts(start_time)", { ascending: true });
  
  if (shiftsError) return { error: shiftsError.message };
  
  if (!assignedShifts || assignedShifts.length === 0) {
    return {
      timezone: tz,
      date_range: { from: args.from, to: args.to },
      total_assigned_shifts: 0,
      missed_count: 0,
      missed_shifts: [],
      summary: { no_check_in: 0, partial_attendance: 0, time_off_covered: 0 }
    };
  }
  
  // Get all attendance logs for this employee in range (to check which shifts were attended)
  const { data: attendanceLogs, error: logsError } = await supabase
    .from("attendance_logs")
    .select("id, shift_id, check_in_at, check_out_at")
    .eq("staff_id", args.employee_id)
    .gte("check_in_at", utcRange.fromUtc)
    .lt("check_in_at", utcRange.toUtc);
  
  if (logsError) return { error: logsError.message };
  
  // Build set of attended shift IDs
  const attendedShiftIds = new Set<string>();
  const attendanceByShift = new Map<string, any>();
  for (const log of attendanceLogs || []) {
    if (log.shift_id) {
      attendedShiftIds.add(log.shift_id);
      attendanceByShift.set(log.shift_id, log);
    }
  }
  
  // Get approved time off for this employee
  const { data: timeOffData, error: timeOffError } = await supabase
    .from("time_off_requests")
    .select("start_date, end_date")
    .eq("employee_id", args.employee_id)
    .eq("status", "approved")
    .gte("end_date", args.from)
    .lte("start_date", args.to);
  
  // Build list of dates with approved time off
  const timeOffDates = new Set<string>();
  if (!timeOffError && timeOffData) {
    for (const req of timeOffData) {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      let current = new Date(start);
      while (current <= end) {
        timeOffDates.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }
  }
  
  // Analyze each shift
  const missedShifts: any[] = [];
  const summary = { no_check_in: 0, partial_attendance: 0, time_off_covered: 0 };
  
  for (const assignment of assignedShifts) {
    const shift = assignment.shifts;
    const shiftId = shift?.id;
    const shiftDate = shift?.shift_date || getDateKeyInTZFallback(shift?.start_time, tz);
    
    // Check if this date is covered by approved time off
    if (timeOffDates.has(shiftDate)) {
      summary.time_off_covered++;
      continue; // Not counted as missed
    }
    
    // Check if there's an attendance log for this shift
    if (!attendedShiftIds.has(shiftId)) {
      // No check-in at all
      missedShifts.push({
        assignment_id: assignment.id,
        shift_id: shiftId,
        shift_date: shiftDate,
        start_time: shift?.start_time,
        end_time: shift?.end_time,
        location: shift?.locations?.name || null,
        reason: "no_check_in",
        details: "Employee did not check in for this shift"
      });
      summary.no_check_in++;
    } else {
      // Has attendance - check if partial (missing checkout)
      const attendance = attendanceByShift.get(shiftId);
      if (attendance && !attendance.check_out_at) {
        missedShifts.push({
          assignment_id: assignment.id,
          shift_id: shiftId,
          shift_date: shiftDate,
          start_time: shift?.start_time,
          end_time: shift?.end_time,
          location: shift?.locations?.name || null,
          reason: "partial_attendance",
          details: "Employee checked in but did not check out",
          check_in_at: attendance.check_in_at
        });
        summary.partial_attendance++;
      }
    }
  }
  
  const capped = capResults(missedShifts);
  
  return {
    timezone: tz,
    date_range: { from: args.from, to: args.to },
    total_assigned_shifts: assignedShifts.length,
    missed_count: missedShifts.length,
    missed_shifts: capped.items,
    truncated: capped.truncated,
    summary
  };
}

async function executeListWarnings(supabase: any, args: { employee_id: string; from: string; to: string }) {
  // staff_events table with event_type = 'warning' or 'coaching_note'
  const { data, error } = await supabase
    .from("staff_events")
    .select("id, event_type, event_date, description, metadata, created_at")
    .eq("staff_id", args.employee_id)
    .in("event_type", ["warning", "coaching_note"])
    .gte("event_date", args.from)
    .lte("event_date", args.to)
    .order("event_date", { ascending: false });
  
  if (error) {
    return { supported: false, reason: error.message };
  }
  
  const capped = capResults(data);
  
  return {
    supported: true,
    count_total: capped.count_total,
    count_returned: capped.count_returned,
    truncated: capped.truncated,
    date_range: { from: args.from, to: args.to },
    warnings: capped.items.map((w: any) => ({
      id: w.id,
      type: w.event_type,
      date: w.event_date,
      description: w.description,
      created_at: w.created_at
    }))
  };
}

async function executeLeaveBalance(supabase: any, args: { employee_id: string; year?: number }) {
  const year = args.year || new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;
  
  const { data, error } = await supabase
    .from("time_off_requests")
    .select("id, request_type, start_date, end_date, status")
    .eq("employee_id", args.employee_id)
    .gte("start_date", startOfYear)
    .lte("start_date", endOfYear);
  
  if (error) {
    return { supported: false, reason: error.message };
  }
  
  const capped = capResults(data);
  
  const summary = {
    approved: 0,
    pending: 0,
    rejected: 0,
    by_type: {} as Record<string, { approved: number; pending: number }>
  };
  
  for (const req of capped.items as any[]) {
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const type = req.request_type || "other";
    if (!summary.by_type[type]) {
      summary.by_type[type] = { approved: 0, pending: 0 };
    }
    
    if (req.status === "approved") {
      summary.approved += days;
      summary.by_type[type].approved += days;
    } else if (req.status === "pending") {
      summary.pending += days;
      summary.by_type[type].pending += days;
    } else if (req.status === "rejected") {
      summary.rejected += days;
    }
  }
  
  return {
    supported: true,
    year,
    total_requests: capped.count_total,
    days_approved: summary.approved,
    days_pending: summary.pending,
    days_rejected: summary.rejected,
    by_type: summary.by_type
  };
}

/**
 * Diagnostic tool to investigate workforce data visibility issues
 */
async function executeDebugEmployeeWorkforceAccess(
  supabase: any, 
  args: { employee_id: string; from: string; to: string; timezone?: string },
  companyId: string
) {
  const tz = args.timezone || DEFAULT_TIMEZONE;
  const employeeId = args.employee_id;
  
  console.log(`[DEBUG] Running workforce access diagnostic for employee: ${employeeId}`);
  
  // Get UTC date range for queries
  const utcRange = await getUTCDateRange(supabase, args.from, args.to, tz);
  
  const diagnosticResult: any = {
    employee_id: employeeId,
    company_id: companyId,
    db_role: null,
    date_range: { from: args.from, to: args.to, timezone: tz },
    utc_range: utcRange || { error: "Failed to convert date range" },
    rls_visibility_checks: {
      employee_exists: false,
      employee_company_id: null,
      employee_status: null,
      attendance_logs_count: 0,
      shift_assignments_count: 0,
      shifts_joinable_count: 0
    },
    sample_rows: {
      attendance_logs: [],
      shift_assignments: [],
      shifts: []
    },
    id_mismatch_detector: {
      flags: [],
      employee_id_format: null,
      sample_staff_ids_in_attendance: [],
      sample_staff_ids_in_assignments: []
    },
    report_source_hint: {
      shifts_table: "public.shifts",
      assignments_table: "public.shift_assignments",
      attendance_table: "public.attendance_logs",
      join_pattern: "shift_assignments.staff_id → employees.id, shift_assignments.shift_id → shifts.id",
      notes: "Reports page uses useShifts hook which queries shifts + shift_assignments with approval_status filter"
    }
  };

  // 1. Check if employee exists and get their data
  const { data: employeeData, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name, company_id, status, user_id")
    .eq("id", employeeId)
    .single();

  if (employeeError || !employeeData) {
    diagnosticResult.rls_visibility_checks.employee_exists = false;
    diagnosticResult.rls_visibility_checks.employee_error = employeeError?.message || "Not found";
    
    // Try to check if the ID exists but in a different format or table
    const { data: anyEmployee } = await supabase
      .from("employees")
      .select("id")
      .limit(3);
    
    if (anyEmployee && anyEmployee.length > 0) {
      diagnosticResult.id_mismatch_detector.sample_employee_ids = anyEmployee.map((e: any) => e.id);
      diagnosticResult.id_mismatch_detector.employee_id_format = anyEmployee[0].id.length === 36 ? "UUID" : "Other";
    }
    
    diagnosticResult.id_mismatch_detector.flags.push("EMPLOYEE_NOT_FOUND: The provided employee_id does not exist or is not visible via RLS");
  } else {
    diagnosticResult.rls_visibility_checks.employee_exists = true;
    diagnosticResult.rls_visibility_checks.employee_company_id = employeeData.company_id;
    diagnosticResult.rls_visibility_checks.employee_status = employeeData.status;
    diagnosticResult.rls_visibility_checks.employee_user_id = employeeData.user_id;
    diagnosticResult.id_mismatch_detector.employee_id_format = employeeId.length === 36 ? "UUID" : "Other";
    
    // Check if employee belongs to the querying user's company
    if (employeeData.company_id !== companyId) {
      diagnosticResult.id_mismatch_detector.flags.push(`COMPANY_MISMATCH: Employee belongs to company ${employeeData.company_id}, but query is from company ${companyId}`);
    }
  }

  // 2. Check attendance_logs count and samples
  if (utcRange) {
    const { data: attendanceLogs, error: attendanceError, count: attendanceCount } = await supabase
      .from("attendance_logs")
      .select("id, staff_id, check_in_at, shift_id, location_id", { count: "exact" })
      .eq("staff_id", employeeId)
      .gte("check_in_at", utcRange.fromUtc)
      .lt("check_in_at", utcRange.toUtc)
      .limit(3);

    diagnosticResult.rls_visibility_checks.attendance_logs_count = attendanceCount || 0;
    
    if (attendanceError) {
      diagnosticResult.rls_visibility_checks.attendance_error = attendanceError.message;
    }
    
    if (attendanceLogs && attendanceLogs.length > 0) {
      diagnosticResult.sample_rows.attendance_logs = attendanceLogs.map((log: any) => ({
        id: log.id,
        staff_id: log.staff_id,
        check_in_at: log.check_in_at,
        shift_id: log.shift_id
      }));
    }
    
    // Get sample staff_ids from attendance_logs (any employee) to check ID patterns
    const { data: sampleAttendance } = await supabase
      .from("attendance_logs")
      .select("staff_id")
      .gte("check_in_at", utcRange.fromUtc)
      .lt("check_in_at", utcRange.toUtc)
      .limit(5);
    
    if (sampleAttendance) {
      const uniqueStaffIds = [...new Set(sampleAttendance.map((a: any) => a.staff_id))];
      diagnosticResult.id_mismatch_detector.sample_staff_ids_in_attendance = uniqueStaffIds.slice(0, 5);
    }
  }

  // 3. Check shift_assignments count and samples
  if (utcRange) {
    const { data: shiftAssignments, error: assignmentError, count: assignmentCount } = await supabase
      .from("shift_assignments")
      .select(`
        id, 
        staff_id, 
        shift_id, 
        approval_status,
        shifts!inner(id, start_time, end_time, shift_date)
      `, { count: "exact" })
      .eq("staff_id", employeeId)
      .gte("shifts.start_time", utcRange.fromUtc)
      .lt("shifts.start_time", utcRange.toUtc)
      .limit(3);

    diagnosticResult.rls_visibility_checks.shift_assignments_count = assignmentCount || 0;
    
    if (assignmentError) {
      diagnosticResult.rls_visibility_checks.assignment_error = assignmentError.message;
    }
    
    if (shiftAssignments && shiftAssignments.length > 0) {
      diagnosticResult.sample_rows.shift_assignments = shiftAssignments.map((sa: any) => ({
        id: sa.id,
        staff_id: sa.staff_id,
        shift_id: sa.shift_id,
        approval_status: sa.approval_status
      }));
    }
    
    // Get sample staff_ids from shift_assignments (any employee) to check ID patterns
    const { data: sampleAssignments } = await supabase
      .from("shift_assignments")
      .select("staff_id, shifts!inner(start_time)")
      .gte("shifts.start_time", utcRange.fromUtc)
      .lt("shifts.start_time", utcRange.toUtc)
      .limit(5);
    
    if (sampleAssignments) {
      const uniqueStaffIds = [...new Set(sampleAssignments.map((a: any) => a.staff_id))];
      diagnosticResult.id_mismatch_detector.sample_staff_ids_in_assignments = uniqueStaffIds.slice(0, 5);
    }
  }

  // 4. Check shifts directly joinable from shift_assignments
  if (utcRange) {
    const { data: shifts, error: shiftsError, count: shiftsCount } = await supabase
      .from("shifts")
      .select("id, start_time, end_time, shift_date, location_id", { count: "exact" })
      .gte("start_time", utcRange.fromUtc)
      .lt("start_time", utcRange.toUtc)
      .limit(3);

    diagnosticResult.rls_visibility_checks.shifts_in_range_count = shiftsCount || 0;
    
    if (shiftsError) {
      diagnosticResult.rls_visibility_checks.shifts_error = shiftsError.message;
    }
    
    if (shifts && shifts.length > 0) {
      diagnosticResult.sample_rows.shifts = shifts.map((s: any) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        shift_date: s.shift_date
      }));
    }
  }

  // 5. Detect ID mismatches
  const staffIdsInAttendance = diagnosticResult.id_mismatch_detector.sample_staff_ids_in_attendance;
  const staffIdsInAssignments = diagnosticResult.id_mismatch_detector.sample_staff_ids_in_assignments;
  
  // Check if employee ID format matches what's in the tables
  if (staffIdsInAttendance.length > 0 && !staffIdsInAttendance.includes(employeeId)) {
    const sampleFormat = staffIdsInAttendance[0]?.length === 36 ? "UUID" : "Other";
    const queryFormat = employeeId.length === 36 ? "UUID" : "Other";
    
    if (sampleFormat !== queryFormat) {
      diagnosticResult.id_mismatch_detector.flags.push(`ID_FORMAT_MISMATCH: attendance_logs uses ${sampleFormat} format, but query uses ${queryFormat}`);
    }
  }
  
  if (staffIdsInAssignments.length > 0 && !staffIdsInAssignments.includes(employeeId)) {
    const sampleFormat = staffIdsInAssignments[0]?.length === 36 ? "UUID" : "Other";
    const queryFormat = employeeId.length === 36 ? "UUID" : "Other";
    
    if (sampleFormat !== queryFormat) {
      diagnosticResult.id_mismatch_detector.flags.push(`ID_FORMAT_MISMATCH: shift_assignments uses ${sampleFormat} format, but query uses ${queryFormat}`);
    }
  }

  // 6. Check if there's data but just not for this employee
  if (diagnosticResult.rls_visibility_checks.attendance_logs_count === 0 && 
      diagnosticResult.rls_visibility_checks.shift_assignments_count === 0) {
    
    // Check if there's any data in the date range
    if (utcRange) {
      const { count: anyAttendanceCount } = await supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .gte("check_in_at", utcRange.fromUtc)
        .lt("check_in_at", utcRange.toUtc);
      
      const { count: anyAssignmentCount } = await supabase
        .from("shift_assignments")
        .select("id, shifts!inner(start_time)", { count: "exact", head: true })
        .gte("shifts.start_time", utcRange.fromUtc)
        .lt("shifts.start_time", utcRange.toUtc);
      
      diagnosticResult.rls_visibility_checks.any_attendance_in_range = anyAttendanceCount || 0;
      diagnosticResult.rls_visibility_checks.any_assignments_in_range = anyAssignmentCount || 0;
      
      if (anyAttendanceCount > 0 || anyAssignmentCount > 0) {
        diagnosticResult.id_mismatch_detector.flags.push("DATA_EXISTS_FOR_OTHERS: Data exists in range but not for this employee - check if employee_id is correct or if they're assigned elsewhere");
      } else {
        diagnosticResult.id_mismatch_detector.flags.push("NO_DATA_IN_RANGE: No attendance or shift assignments found for anyone in this date range");
      }
    }
  }

  // 7. Summary
  diagnosticResult.summary = {
    total_flags: diagnosticResult.id_mismatch_detector.flags.length,
    likely_issue: diagnosticResult.id_mismatch_detector.flags.length > 0 
      ? diagnosticResult.id_mismatch_detector.flags[0] 
      : "No obvious issues detected - data may genuinely be empty for this employee/range"
  };

  console.log(`[DEBUG] Diagnostic complete:`, JSON.stringify(diagnosticResult.summary));

  return diagnosticResult;
}

// Execute a tool call - dbRole is authoritative role from DB
async function executeTool(supabase: any, toolName: string, args: any, dbRole: string, companyId?: string): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case "search_employees":
      return executeSearchEmployees(supabase, args);
    case "get_employee_profile":
      return executeGetEmployeeProfile(supabase, args, dbRole);
    case "list_shifts":
      return executeListShifts(supabase, args);
    case "list_attendance_logs":
      return executeListAttendanceLogs(supabase, args);
    case "compute_hours_worked":
      return executeComputeHoursWorked(supabase, args);
    case "compute_days_worked":
      return executeComputeDaysWorked(supabase, args);
    case "compute_missed_shifts":
      return executeComputeMissedShifts(supabase, args);
    case "list_warnings":
      return executeListWarnings(supabase, args);
    case "leave_balance":
      return executeLeaveBalance(supabase, args);
    case "debug_employee_workforce_access":
      return executeDebugEmployeeWorkforceAccess(supabase, args, companyId || "");
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

const getSystemPrompt = (displayRole: string, modules: string[]) => {
  const baseKnowledge = `You are Dashspect Intelligence, an AI assistant that provides accurate, data-driven answers about employee activity and platform operations.

IMPORTANT: Always refer to the platform as "Dashspect" (lowercase 's'), never "DashSpect".

**Your Capabilities:**
You have access to real-time data through tools. Use them to answer questions about:
- Employee shifts and schedules
- Attendance logs (clock-in/clock-out times)
- Hours worked and days worked calculations
- Missed shifts (no-shows, partial attendance)
- Warnings and discipline records
- Leave/time-off balances
- Diagnostic checks for data visibility issues

**Evidence-Backed Answers (CRITICAL):**
When answering data questions, you MUST:
1. Always include the date range used
2. Always mention the timezone (default: Europe/Bucharest)
3. State evidence summary: "Based on X attendance logs, Y shifts..."
4. Mention any anomalies found (missing checkouts, open sessions, missed shifts)
5. For ambiguous employee names, search first and ask user to confirm if multiple matches

**CRITICAL: Zero-Result Diagnostic Protocol:**
When a data query returns 0 results unexpectedly (e.g., "0 shifts" or "0 attendance logs" for an employee who the user believes should have data):
1. DO NOT simply report "0 results found"
2. IMMEDIATELY call the debug_employee_workforce_access tool to diagnose the issue
3. Analyze the diagnostic results to identify potential causes:
   - Employee ID mismatch (wrong ID format, wrong employee)
   - Company mismatch (employee belongs to different company)
   - RLS visibility issues
   - Date range problems
   - Data genuinely doesn't exist
4. Report your findings clearly: explain what was checked and what the likely cause is
5. Suggest corrective actions (e.g., "try searching for the employee by name first", "verify the employee ID")

**PII Access Rules:**
- Phone numbers and email addresses are protected PII
- You can only reveal PII if the user is an admin or manager
- If PII is requested but not allowed, explain politely that only admins/managers can access that information

**Evidence Block:**
At the end of data-driven answers, include:
---
📊 EVIDENCE: [X logs, Y shifts analyzed] | Range: [from] to [to] | Timezone: [tz]
⚠️ ANOMALIES: [list if any, or "None"]
---

**Platform Overview:**
Dashspect is a comprehensive business operations management platform designed for multi-location businesses.

**Core Modules:**
- Location Audits: Audit templates, compliance scores, PDF reports
- Equipment Management: Asset tracking, maintenance scheduling
- Workforce Management: Shifts, attendance via QR kiosks, time-off requests
- Notifications: Targeted alerts and reminders
- Documents: Company documents with required reading tracking
- Reports: Compliance and performance analytics
- Tests: Training tests with AI-generated questions`;

  const roleSpecificKnowledge: Record<string, string> = {
    admin: `

**Your Role: Administrator**
As an Admin, you have full access including PII (phone, email) for employees.
You can view all company data, manage users, and access detailed reports.`,

    manager: `

**Your Role: Manager**
As a Manager, you can view PII (phone, email) for employees in your locations.
You oversee operations, approve requests, and manage your team.`,

    company_admin: `

**Your Role: Company Administrator**
As a Company Admin, you have full access including PII (phone, email) for employees.
You can view all company data, manage users, and access detailed reports.`,

    company_owner: `

**Your Role: Company Owner**
As a Company Owner, you have full access including PII (phone, email) for employees.
You own the company data and have unrestricted access.`,

    checker: `

**Your Role: Checker**
You perform audits and equipment checks. You cannot access employee PII.`,

    staff: `

**Your Role: Staff Member**
You can view your own schedule and attendance. You cannot access other employees' PII.`
  };

  let roleKnowledge = roleSpecificKnowledge[displayRole] || roleSpecificKnowledge.staff;
  
  const moduleContext = modules.length > 0 
    ? `\n\n**Active Modules:** ${modules.join(", ")}`
    : "";

  return `${baseKnowledge}${roleKnowledge}${moduleContext}

Be accurate, cite your data sources, and never hallucinate. If data is unavailable or a feature isn't supported, say so clearly.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { messages, role: requestRole = "staff", modules = [] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = claimsData.claims.sub;
    
    const { data: companyUserData, error: companyUserError } = await supabase
      .from("company_users")
      .select("company_id, company_role")
      .eq("user_id", userId)
      .single();
    
    if (companyUserError || !companyUserData) {
      console.error("Failed to get user company data:", companyUserError);
      return new Response(JSON.stringify({ error: "User not found in any company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const companyId = companyUserData.company_id;
    const dbRole = companyUserData.company_role;
    const displayRole = requestRole;
    
    console.log(`AI Guide request - User: ${userId}, Company: ${companyId}, DB Role: ${dbRole}, Display Role: ${displayRole}`);

    const systemPrompt = getSystemPrompt(displayRole, modules);
    
    let conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const maxIterations = 4;
    let iteration = 0;
    const toolsUsed: string[] = [];
    const employeeIds: string[] = [];
    let piiRequested = false;
    let piiReleased = false;
    let dateRangeFrom: string | null = null;
    let dateRangeTo: string | null = null;

    while (iteration < maxIterations) {
      iteration++;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          tool_choice: "auto",
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await response.json();
      const choice = result.choices?.[0];
      
      if (!choice) {
        throw new Error("No response from AI model");
      }

      const assistantMessage = choice.message;
      
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversationMessages.push(assistantMessage);
        
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let args: any;
          
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }
          
          toolsUsed.push(toolName);
          
          if (args.employee_id && !employeeIds.includes(args.employee_id)) {
            employeeIds.push(args.employee_id);
          }
          
          if (args.include_pii) piiRequested = true;
          if (args.from && (!dateRangeFrom || args.from < dateRangeFrom)) dateRangeFrom = args.from;
          if (args.to && (!dateRangeTo || args.to > dateRangeTo)) dateRangeTo = args.to;
          
          const toolResult = await executeTool(supabase, toolName, args, dbRole, companyId);
          
          if (toolName === "get_employee_profile" && toolResult.pii_included) {
            piiReleased = true;
          }
          
          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        continue;
      }
      
      const finalContent = assistantMessage.content || "";
      
      try {
        await supabase.from("ai_guide_audit_logs").insert({
          company_id: companyId,
          user_id: userId,
          role: dbRole,
          question: messages[messages.length - 1]?.content || "",
          answer_preview: finalContent.substring(0, 500),
          tools_used: toolsUsed,
          employee_ids: employeeIds,
          pii_requested: piiRequested,
          pii_released: piiReleased,
          range_from: dateRangeFrom,
          range_to: dateRangeTo
        });
      } catch (logError) {
        console.error("Failed to log AI Guide interaction:", logError);
      }
      
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          const chunkSize = 20;
          let position = 0;
          
          const sendChunks = () => {
            if (position < finalContent.length) {
              const chunk = finalContent.slice(position, position + chunkSize);
              position += chunkSize;
              
              const sseData = {
                id: `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: "google/gemini-2.5-flash",
                choices: [{
                  index: 0,
                  delta: { content: chunk },
                  finish_reason: null
                }]
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
              
              setTimeout(sendChunks, 10);
            } else {
              const finalSseData = {
                id: `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: "google/gemini-2.5-flash",
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: "stop"
                }]
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalSseData)}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          };
          
          sendChunks();
        }
      });

      return new Response(stream, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      });
    }

    return new Response(JSON.stringify({ 
      error: "Request processing exceeded maximum iterations" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Guide error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
