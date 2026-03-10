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
  days_confirmed: number;
  regular_hours: number;
  overtime_hours: number;
  // Partial shifts (actual < 75% of scheduled)
  partial_count: number;
  partial_dates: string[];
  // Half shifts (intentionally scheduled as half)
  half_shift_count: number;
  half_shift_dates: string[];
  // Extra half shifts
  extra_half_count: number;
  extra_half_dates: string[];
  // Late arrivals
  late_count: number;
  total_late_minutes: number;
  late_dates: string[];
  // Extra schedule (unscheduled attendance, manager-approved)
  extra_schedule_days: number;
  extra_schedule_dates: string[];
  // Leave
  vacation_days: number;
  medical_days: number;
  // Absence (recorded via workforce_exceptions)
  absent_days: number;
  absent_details: Array<{ date: string; reason_code: string }>;
  // Missing (no attendance, no recorded absence)
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

const PARTIAL_THRESHOLD = 0.75;

/**
 * Computes detailed payroll breakdown for a batch period.
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

      // 1. Get shifts with assignments (filter by location here, not on employees)
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          id, shift_date, start_time, end_time, location_id, shift_type,
          locations(name, requires_checkin),
          shift_assignments!inner(staff_id, approval_status)
        `)
        .gte("shift_date", periodStart)
        .lte("shift_date", periodEnd)
        .eq("shift_assignments.approval_status", "approved");
      if (locationId) shiftsQuery = shiftsQuery.eq("location_id", locationId);
      const { data: shifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      // 2. Derive employee IDs from shift assignments (cross-location safe)
      const staffIdsFromShifts = new Set<string>();
      for (const shift of shifts || []) {
        for (const sa of shift.shift_assignments || []) {
          staffIdsFromShifts.add((sa as any).staff_id);
        }
      }

      // Also include employees with attendance logs at this location during the period
      let attQuery = supabase
        .from("attendance_logs")
        .select("id, staff_id, shift_id, check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, approved_by, early_departure_reason")
        .gte("check_in_at", `${periodStart}T00:00:00`)
        .lte("check_in_at", `${periodEnd}T23:59:59`);
      if (locationId) attQuery = attQuery.eq("location_id", locationId);
      const { data: attendanceLogs, error: attError } = await attQuery;
      if (attError) throw attError;

      for (const log of attendanceLogs || []) {
        staffIdsFromShifts.add(log.staff_id);
      }

      // Fetch employees by collected IDs (no location filter — cross-location safe)
      let employees: any[] = [];
      if (staffIdsFromShifts.size > 0) {
        const staffIdArray = Array.from(staffIdsFromShifts);
        // Supabase .in() has a limit; batch if needed
        const batchSize = 100;
        for (let i = 0; i < staffIdArray.length; i += batchSize) {
          const batch = staffIdArray.slice(i, i + batchSize);
          const { data, error: empError } = await supabase
            .from("employees")
            .select("id, full_name, role, location_id, locations(name)")
            .eq("status", "active")
            .in("id", batch);
          if (empError) throw empError;
          if (data) employees = employees.concat(data);
        }
      } else if (!locationId) {
        // No location filter and no shifts found — fall back to all active employees
        const { data, error: empError } = await supabase
          .from("employees")
          .select("id, full_name, role, location_id, locations(name)")
          .eq("status", "active");
        if (empError) throw empError;
        employees = data || [];
      }

      // 3. Attendance logs already fetched above (with location filter)

      // 4. Get time-off requests (approved)
      const { data: timeOffRequests, error: toError } = await supabase
        .from("time_off_requests")
        .select("id, employee_id, start_date, end_date, request_type, status")
        .eq("status", "approved")
        .lte("start_date", periodEnd)
        .gte("end_date", periodStart);
      if (toError) throw toError;

      // 5. Get recorded absences from workforce_exceptions
      const { data: absenceExceptions, error: absErr } = await supabase
        .from("workforce_exceptions")
        .select("id, employee_id, shift_id, shift_date, reason_code")
        .eq("exception_type", "absence")
        .gte("shift_date", periodStart)
        .lte("shift_date", periodEnd);
      if (absErr) throw absErr;

      // 6. Get approved late exceptions (excused lates)
      const { data: approvedLateExceptions, error: lateExcErr } = await supabase
        .from("workforce_exceptions")
        .select("id, employee_id, attendance_id")
        .eq("exception_type", "late_start")
        .eq("status", "approved")
        .gte("shift_date", periodStart)
        .lte("shift_date", periodEnd);
      if (lateExcErr) throw lateExcErr;

      // Build excused late lookup: attendance_id -> true
      const excusedLateAttendanceIds = new Set<string>();
      for (const exc of approvedLateExceptions || []) {
        if (exc.attendance_id) excusedLateAttendanceIds.add(exc.attendance_id);
      }

      // Build absence lookup: employeeId_shiftId -> reason_code
      const absenceLookup = new Map<string, string>();
      for (const exc of absenceExceptions || []) {
        absenceLookup.set(`${exc.employee_id}_${exc.shift_id}`, exc.reason_code || 'unspecified');
      }

      // Build lookup structures
      const employeeShifts: Record<string, Array<{
        shift_id: string; date: string; start_time: string; end_time: string;
        location_id: string; location_name: string; requires_checkin: boolean;
        shift_type: string | null;
      }>> = {};

      for (const shift of shifts || []) {
        const locData = shift.locations as any;
        for (const sa of shift.shift_assignments || []) {
          const staffId = (sa as any).staff_id;
          if (!employeeShifts[staffId]) employeeShifts[staffId] = [];
          employeeShifts[staffId].push({
            shift_id: shift.id, date: shift.shift_date,
            start_time: shift.start_time, end_time: shift.end_time,
            location_id: shift.location_id,
            location_name: locData?.name || "Unknown",
            requires_checkin: locData?.requires_checkin || false,
            shift_type: (shift as any).shift_type || null,
          });
        }
      }

      const attByEmployee: Record<string, typeof attendanceLogs> = {};
      for (const log of attendanceLogs || []) {
        if (!attByEmployee[log.staff_id]) attByEmployee[log.staff_id] = [];
        attByEmployee[log.staff_id]!.push(log);
      }

      const timeOffByEmployee: Record<string, typeof timeOffRequests> = {};
      for (const req of timeOffRequests || []) {
        if (!timeOffByEmployee[req.employee_id]) timeOffByEmployee[req.employee_id] = [];
        timeOffByEmployee[req.employee_id]!.push(req);
      }

      // Calculate details for each employee
      const details: PayrollEmployeeDetail[] = [];

      for (const emp of employees || []) {
        const empShifts = employeeShifts[emp.id] || [];
        const empAttendance = attByEmployee[emp.id] || [];
        const empTimeOff = timeOffByEmployee[emp.id] || [];
        const empLocationData = emp.locations as any;
        const empLocationName = empLocationData?.name || "Unknown";

        const pastShifts = empShifts.filter(s => startOfDay(parseISO(s.date)) <= today);

        let daysWorked = 0;
        let daysConfirmed = 0;
        let regularHours = 0;
        let overtimeHours = 0;
        const anomalies: string[] = [];
        const missingDates: string[] = [];
        const absentDetails: Array<{ date: string; reason_code: string }> = [];
        const extraLocationDetails: Array<{ date: string; location_name: string }> = [];
        const earlyDepartureDetails: Array<{ date: string; reason: string }> = [];
        const partialDates: string[] = [];
        const halfShiftDates: string[] = [];
        const extraHalfDates: string[] = [];
        const lateDates: string[] = [];
        let lateCount = 0;
        let totalLateMinutes = 0;

        for (const shift of pastShifts) {
          let attLog = empAttendance.find(a => a.shift_id === shift.shift_id);
          if (!attLog) {
            attLog = empAttendance.find(a => {
              if (a.staff_id !== emp.id) return false;
              if (a.shift_id) return false;
              return format(new Date(a.check_in_at), 'yyyy-MM-dd') === shift.date;
            });
          }

          const hasAttendance = !!attLog;
          const hasCheckOut = !!(attLog?.check_out_at);

          if (hasAttendance || !shift.requires_checkin) {
            // Calculate scheduled hours
            const startTime = parseISO(`${shift.date}T${shift.start_time}`);
            let endTime = parseISO(`${shift.date}T${shift.end_time}`);
            if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86400000);
            const scheduledHours = differenceInMinutes(endTime, startTime) / 60;

            let actualHours = scheduledHours;
            if (hasAttendance && hasCheckOut) {
              actualHours = differenceInMinutes(new Date(attLog!.check_out_at!), new Date(attLog!.check_in_at)) / 60;
            }

            // Partial shift detection: actual < 75% of scheduled
            // Skip for half/extra_half shifts — they are intentionally short
            const isHalfType = shift.shift_type === 'half' || shift.shift_type === 'extra_half';
            const isPartial = !isHalfType && hasAttendance && hasCheckOut && actualHours < scheduledHours * PARTIAL_THRESHOLD;

            if (isPartial) {
              partialDates.push(shift.date);
              anomalies.push(`Partial shift on ${shift.date} (${actualHours.toFixed(1)}h / ${scheduledHours.toFixed(1)}h)`);
            }

            // Track half shift types
            if (shift.shift_type === 'half') {
              halfShiftDates.push(shift.date);
            } else if (shift.shift_type === 'extra_half') {
              extraHalfDates.push(shift.date);
            }

            daysWorked++;
            if (hasAttendance && hasCheckOut) daysConfirmed++;

            regularHours += Math.min(actualHours, scheduledHours);
            if (actualHours > scheduledHours) {
              overtimeHours += actualHours - scheduledHours;
            }

            // Cross-location
            if (shift.location_id !== emp.location_id) {
              extraLocationDetails.push({ date: shift.date, location_name: shift.location_name });
            }

            // Early departures
            if (attLog && (attLog as any).early_departure_reason) {
              earlyDepartureDetails.push({ date: shift.date, reason: (attLog as any).early_departure_reason });
            }

            // Late tracking — skip excused lates
            if (attLog?.is_late && !excusedLateAttendanceIds.has(attLog.id)) {
              lateCount++;
              totalLateMinutes += attLog.late_minutes || 0;
              lateDates.push(shift.date);
              anomalies.push(`Late on ${shift.date}`);
            } else if (attLog?.is_late && excusedLateAttendanceIds.has(attLog.id)) {
              anomalies.push(`Late on ${shift.date} (excused)`);
            }
            if (attLog?.auto_clocked_out) anomalies.push(`Auto-clocked out on ${shift.date}`);
          } else {
            const isCoveredByTimeOff = empTimeOff.some(req =>
              shift.date >= req.start_date && shift.date <= req.end_date
            );

            if (!isCoveredByTimeOff) {
              const absenceKey = `${emp.id}_${shift.shift_id}`;
              const absenceReason = absenceLookup.get(absenceKey);
              if (absenceReason) {
                absentDetails.push({ date: shift.date, reason_code: absenceReason });
                anomalies.push(`Absent on ${shift.date} (${absenceReason})`);
              } else {
                missingDates.push(shift.date);
                anomalies.push(`Missing on ${shift.date}`);
              }
            }
          }
        }

        // Extra schedule: attendance without matching shift
        const scheduledShiftIds = new Set(empShifts.map(s => s.shift_id));
        const scheduledDates = new Set(empShifts.map(s => s.date));
        const extraScheduleDates: string[] = [];

        for (const log of empAttendance) {
          const logDate = format(new Date(log.check_in_at), 'yyyy-MM-dd');
          if (!(log.shift_id && scheduledShiftIds.has(log.shift_id)) && !scheduledDates.has(logDate)) {
            if (!extraScheduleDates.includes(logDate)) extraScheduleDates.push(logDate);
          }
        }

        // Time-off days
        let vacationDays = 0;
        let medicalDays = 0;
        for (const req of empTimeOff) {
          const start = parseISO(req.start_date) < parseISO(periodStart) ? parseISO(periodStart) : parseISO(req.start_date);
          const end = parseISO(req.end_date) > parseISO(periodEnd) ? parseISO(periodEnd) : parseISO(req.end_date);
          const days = eachDayOfInterval({ start, end }).length;
          if (req.request_type === "vacation" || req.request_type === "annual_leave") vacationDays += days;
          else if (req.request_type === "medical" || req.request_type === "sick_leave") medicalDays += days;
        }

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
          partial_count: partialDates.length,
          partial_dates: partialDates.sort(),
          half_shift_count: halfShiftDates.length,
          half_shift_dates: halfShiftDates.sort(),
          extra_half_count: extraHalfDates.length,
          extra_half_dates: extraHalfDates.sort(),
          late_count: lateCount,
          total_late_minutes: totalLateMinutes,
          late_dates: lateDates.sort(),
          extra_schedule_days: extraScheduleDates.length,
          extra_schedule_dates: extraScheduleDates.sort(),
          vacation_days: vacationDays,
          medical_days: medicalDays,
          absent_days: absentDetails.length,
          absent_details: absentDetails.sort((a, b) => a.date.localeCompare(b.date)),
          missing_no_reason: missingDates.length,
          missing_no_reason_dates: missingDates.sort(),
          extra_location_days: extraLocationDetails.length,
          extra_location_details: extraLocationDetails.sort((a, b) => a.date.localeCompare(b.date)),
          early_departure_days: earlyDepartureDetails.length,
          early_departure_details: earlyDepartureDetails.sort((a, b) => a.date.localeCompare(b.date)),
          anomalies,
        });
      }

      details.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
      return details;
    },
    enabled: !!periodStart && !!periodEnd && !!companyId,
  });
}
