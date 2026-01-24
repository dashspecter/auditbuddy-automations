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

// Execute a tool call - dbRole is authoritative role from DB
async function executeTool(supabase: any, toolName: string, args: any, dbRole: string): Promise<any> {
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

**Evidence-Backed Answers (CRITICAL):**
When answering data questions, you MUST:
1. Always include the date range used
2. Always mention the timezone (default: Europe/Bucharest)
3. State evidence summary: "Based on X attendance logs, Y shifts..."
4. Mention any anomalies found (missing checkouts, open sessions, missed shifts)
5. For ambiguous employee names, search first and ask user to confirm if multiple matches

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
      .select("company_id, role")
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
    const dbRole = companyUserData.role;
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
          
          const toolResult = await executeTool(supabase, toolName, args, dbRole);
          
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
