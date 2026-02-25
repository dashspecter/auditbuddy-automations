import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes, startOfDay, eachDayOfInterval } from "date-fns";

export interface PayrollEmployeeDetail {
  employee_id: string;
  employee_name: string;
  role: string;
  location_name: string;
  // Core metrics
  days_worked: number;
  days_confirmed: number; // Backed by check-in/check-out
  regular_hours: number;
  overtime_hours: number;
  // Extra schedule (unscheduled attendance, manager-approved)
  extra_schedule_days: number;
  extra_schedule_dates: string[];
  // Leave
  vacation_days: number;
  medical_days: number;
  // Absence
  missing_no_reason: number;
  missing_no_reason_dates: string[];
  // Cross-location
  extra_location_days: number;
  extra_location_details: Array<{ date: string; location_name: string }>;
  // Early departures
  early_departure_days: number;
  early_departure_details: Array<{ date: string; reason: string }>;
  // Anomalies count (for existing badge)
  anomalies: string[];
}

/**
 * Computes detailed payroll breakdown for a batch period.
 * Queries shifts, attendance, and time-off data to produce
 * accurate per-employee metrics.
 */
export function usePayrollBatchDetails(
  periodStart?: string,
  periodEnd?: string,
  companyId?: string,
  locationId?: string | null
) {
  return useQuery({
    queryKey: ["payroll-batch-details", periodStart, periodEnd, companyId, locationId],
    queryFn: async () => {
      if (!periodStart || !periodEnd || !companyId) return [];

      const today = startOfDay(new Date());

      // 1. Get active employees for this company (filtered by location if specified)
      let empQuery = supabase
        .from("employees")
        .select("id, full_name, role, location_id, locations(name)")
        .eq("status", "active");
      
      if (locationId) {
        empQuery = empQuery.eq("location_id", locationId);
      }
      
      const { data: employees, error: empError } = await empQuery;
      if (empError) throw empError;

      // 2. Get shifts with assignments for the period
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select(`
          id, shift_date, start_time, end_time, location_id,
          locations(name, requires_checkin),
          shift_assignments!inner(staff_id, approval_status)
        `)
        .gte("shift_date", periodStart)
        .lte("shift_date", periodEnd)
        .eq("shift_assignments.approval_status", "approved");
      if (shiftsError) throw shiftsError;

      // 3. Get attendance logs for the period
      const { data: attendanceLogs, error: attError } = await supabase
        .from("attendance_logs")
        .select("id, staff_id, shift_id, check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, approved_by, early_departure_reason")
        .gte("check_in_at", `${periodStart}T00:00:00`)
        .lte("check_in_at", `${periodEnd}T23:59:59`);
      if (attError) throw attError;

      // 4. Get time-off requests (approved) for the period
      const { data: timeOffRequests, error: toError } = await supabase
        .from("time_off_requests")
        .select("id, employee_id, start_date, end_date, request_type, status")
        .eq("status", "approved")
        .lte("start_date", periodEnd)
        .gte("end_date", periodStart);
      if (toError) throw toError;

      // Build lookup structures
      const employeeShifts: Record<string, Array<{
        shift_id: string;
        date: string;
        start_time: string;
        end_time: string;
        location_id: string;
        location_name: string;
        requires_checkin: boolean;
      }>> = {};

      for (const shift of shifts || []) {
        const locData = shift.locations as any;
        for (const sa of shift.shift_assignments || []) {
          const staffId = (sa as any).staff_id;
          if (!employeeShifts[staffId]) employeeShifts[staffId] = [];
          employeeShifts[staffId].push({
            shift_id: shift.id,
            date: shift.shift_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            location_id: shift.location_id,
            location_name: locData?.name || "Unknown",
            requires_checkin: locData?.requires_checkin || false,
          });
        }
      }

      // Attendance logs by employee
      const attByEmployee: Record<string, typeof attendanceLogs> = {};
      for (const log of attendanceLogs || []) {
        if (!attByEmployee[log.staff_id]) attByEmployee[log.staff_id] = [];
        attByEmployee[log.staff_id]!.push(log);
      }

      // Time-off by employee
      const timeOffByEmployee: Record<string, typeof timeOffRequests> = {};
      for (const req of timeOffRequests || []) {
        if (!timeOffByEmployee[req.employee_id]) timeOffByEmployee[req.employee_id] = [];
        timeOffByEmployee[req.employee_id]!.push(req);
      }

      // Location lookup for employees
      const employeeLocationMap: Record<string, string> = {};
      for (const emp of employees || []) {
        employeeLocationMap[emp.id] = emp.location_id;
      }

      // Location name lookup
      const locationNames: Record<string, string> = {};
      for (const shift of shifts || []) {
        const locData = shift.locations as any;
        if (locData?.name) locationNames[shift.location_id] = locData.name;
      }

      // Calculate details for each employee
      const details: PayrollEmployeeDetail[] = [];

      for (const emp of employees || []) {
        const empShifts = employeeShifts[emp.id] || [];
        const empAttendance = attByEmployee[emp.id] || [];
        const empTimeOff = timeOffByEmployee[emp.id] || [];
        const empLocationData = emp.locations as any;
        const empLocationName = empLocationData?.name || "Unknown";

        // Past shifts only
        const pastShifts = empShifts.filter(s => startOfDay(parseISO(s.date)) <= today);

        // Days worked: shifts that have attendance OR don't require check-in
        let daysWorked = 0;
        let daysConfirmed = 0; // Backed by actual check-in AND check-out
        let regularHours = 0;
        let overtimeHours = 0;
        const anomalies: string[] = [];
        const missingDates: string[] = [];
        const extraLocationDetails: Array<{ date: string; location_name: string }> = [];
        const earlyDepartureDetails: Array<{ date: string; reason: string }> = [];

        const workedDatesSet = new Set<string>();

        for (const shift of pastShifts) {
          // Find matching attendance
          let attLog = empAttendance.find(a => a.shift_id === shift.shift_id);
          if (!attLog) {
            // Try by date
            attLog = empAttendance.find(a => {
              if (a.staff_id !== emp.id) return false;
              if (a.shift_id) return false;
              return format(new Date(a.check_in_at), 'yyyy-MM-dd') === shift.date;
            });
          }

          const hasAttendance = !!attLog;
          const hasCheckOut = !!(attLog?.check_out_at);

          if (hasAttendance || !shift.requires_checkin) {
            daysWorked++;
            workedDatesSet.add(shift.date);

            if (hasAttendance && hasCheckOut) {
              daysConfirmed++;
            }

            // Calculate hours
            const startTime = parseISO(`${shift.date}T${shift.start_time}`);
            let endTime = parseISO(`${shift.date}T${shift.end_time}`);
            if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86400000);
            const scheduledHours = differenceInMinutes(endTime, startTime) / 60;

            let actualHours = scheduledHours;
            if (hasAttendance && hasCheckOut) {
              actualHours = differenceInMinutes(new Date(attLog!.check_out_at!), new Date(attLog!.check_in_at)) / 60;
            }

            regularHours += Math.min(actualHours, scheduledHours);
            if (actualHours > scheduledHours) {
              overtimeHours += actualHours - scheduledHours;
            }

            // Check cross-location work
            if (shift.location_id !== emp.location_id) {
              extraLocationDetails.push({
                date: shift.date,
                location_name: shift.location_name,
              });
            }

            // Track early departures
            if (attLog && (attLog as any).early_departure_reason) {
              earlyDepartureDetails.push({
                date: shift.date,
                reason: (attLog as any).early_departure_reason,
              });
            }

            // Track anomalies
            if (attLog?.is_late) anomalies.push(`Late on ${shift.date}`);
            if (attLog?.auto_clocked_out) anomalies.push(`Auto-clocked out on ${shift.date}`);
          } else {
            // Check if the missed day is covered by time-off
            const isCoveredByTimeOff = empTimeOff.some(req => {
              const start = req.start_date;
              const end = req.end_date;
              return shift.date >= start && shift.date <= end;
            });

            if (!isCoveredByTimeOff) {
              missingDates.push(shift.date);
              anomalies.push(`Missing on ${shift.date}`);
            }
          }
        }

        // Extra schedule: attendance logs WITHOUT a matching scheduled shift (unscheduled work)
        const scheduledShiftIds = new Set(empShifts.map(s => s.shift_id));
        const scheduledDates = new Set(empShifts.map(s => s.date));
        const extraScheduleDates: string[] = [];

        for (const log of empAttendance) {
          const logDate = format(new Date(log.check_in_at), 'yyyy-MM-dd');
          const matchesShift = log.shift_id && scheduledShiftIds.has(log.shift_id);
          const matchesDate = scheduledDates.has(logDate);

          if (!matchesShift && !matchesDate) {
            // This is an unscheduled attendance
            if (!extraScheduleDates.includes(logDate)) {
              extraScheduleDates.push(logDate);
            }
          }
        }

        // Count time-off days within the period
        let vacationDays = 0;
        let medicalDays = 0;

        for (const req of empTimeOff) {
          const start = parseISO(req.start_date) < parseISO(periodStart) ? parseISO(periodStart) : parseISO(req.start_date);
          const end = parseISO(req.end_date) > parseISO(periodEnd) ? parseISO(periodEnd) : parseISO(req.end_date);
          const days = eachDayOfInterval({ start, end }).length;

          if (req.request_type === "vacation" || req.request_type === "annual_leave") {
            vacationDays += days;
          } else if (req.request_type === "medical" || req.request_type === "sick_leave") {
            medicalDays += days;
          }
        }

        // Only include employees that have some activity in the period
        const hasActivity = empShifts.length > 0 || empAttendance.length > 0 || empTimeOff.length > 0;
        if (!hasActivity) continue;

        details.push({
          employee_id: emp.id,
          employee_name: emp.full_name,
          role: emp.role,
          location_name: empLocationName,
          days_worked: daysWorked,
          days_confirmed: daysConfirmed,
          regular_hours: Math.round(regularHours * 10) / 10,
          overtime_hours: Math.round(overtimeHours * 10) / 10,
          extra_schedule_days: extraScheduleDates.length,
          extra_schedule_dates: extraScheduleDates.sort(),
          vacation_days: vacationDays,
          medical_days: medicalDays,
          missing_no_reason: missingDates.length,
          missing_no_reason_dates: missingDates.sort(),
          extra_location_days: extraLocationDetails.length,
          extra_location_details: extraLocationDetails.sort((a, b) => a.date.localeCompare(b.date)),
          early_departure_days: earlyDepartureDetails.length,
          early_departure_details: earlyDepartureDetails.sort((a, b) => a.date.localeCompare(b.date)),
          anomalies,
        });
      }

      // Sort by name
      details.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

      return details;
    },
    enabled: !!periodStart && !!periodEnd && !!companyId,
  });
}
