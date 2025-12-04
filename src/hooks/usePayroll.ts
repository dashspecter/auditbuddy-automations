import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, differenceInMinutes, isWithinInterval } from "date-fns";

export interface PayrollPeriod {
  id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  created_by: string;
}

export interface PayrollItem {
  id: string;
  period_id: string;
  staff_id: string;
  type: string;
  amount: number;
  hours: number;
  rate: number;
  description: string;
  metadata: any;
  created_at: string;
  employees?: {
    full_name: string;
    role: string;
    hourly_rate: number;
    base_salary: number;
  };
}

export interface DailyPayrollEntry {
  employee_id: string;
  employee_name: string;
  role: string;
  date: string;
  scheduled_hours: number;
  actual_hours: number;
  hourly_rate: number;
  daily_amount: number;
  shift_id: string;
  location_id: string;
  location_name: string;
  is_late: boolean;
  late_minutes: number;
  auto_clocked_out: boolean;
  requires_checkin: boolean;
  is_missed: boolean; // True when check-in required but no attendance
}

export interface PayrollSummaryItem {
  employee_id: string;
  employee_name: string;
  role: string;
  hourly_rate: number;
  scheduled_hours: number;
  actual_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  total_amount: number;
  days_worked: number;
  late_count: number;
  total_late_minutes: number;
  expected_weekly_hours: number | null;
  expected_shifts_per_week: number | null;
  extra_shifts: number;
  missing_shifts: number;
}

export const usePayrollPeriods = () => {
  return useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });
};

export const usePayrollItems = (periodId?: string) => {
  return useQuery({
    queryKey: ["payroll-items", periodId],
    queryFn: async () => {
      let query = supabase
        .from("payroll_items")
        .select("*, employees(full_name, role, hourly_rate, base_salary)")
        .order("created_at", { ascending: false });
      
      if (periodId) {
        query = query.eq("period_id", periodId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollItem[];
    },
    enabled: !!periodId,
  });
};

// Calculate payroll from shifts data with attendance comparison
export const usePayrollFromShifts = (startDate?: string, endDate?: string, locationId?: string) => {
  return useQuery({
    queryKey: ["payroll-from-shifts", startDate, endDate, locationId],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      // Get shifts within the date range with their assignments
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          id,
          shift_date,
          start_time,
          end_time,
          role,
          location_id,
          locations(name, requires_checkin),
          shift_assignments!inner(
            id,
            staff_id,
            approval_status,
            employees!inner(
              id,
              full_name,
              role,
              hourly_rate,
              expected_weekly_hours,
              expected_shifts_per_week
            )
          )
        `)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .eq("shift_assignments.approval_status", "approved");

      if (locationId) {
        shiftsQuery = shiftsQuery.eq("location_id", locationId);
      }

      const { data: shifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      // Get attendance logs for the period
      const { data: attendanceLogs, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("*")
        .gte("check_in_at", `${startDate}T00:00:00`)
        .lte("check_in_at", `${endDate}T23:59:59`);

      if (attendanceError) throw attendanceError;

      // Calculate daily payroll entries with actual vs scheduled comparison
      const payrollEntries: DailyPayrollEntry[] = [];

      for (const shift of shifts || []) {
        for (const assignment of shift.shift_assignments || []) {
          const employee = assignment.employees;
          if (!employee) continue;

          // Calculate scheduled hours from shift times
          const startTime = parseISO(`${shift.shift_date}T${shift.start_time}`);
          let endTime = parseISO(`${shift.shift_date}T${shift.end_time}`);
          
          // Handle overnight shifts
          if (endTime <= startTime) {
            endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
          }
          
          const scheduledMinutes = differenceInMinutes(endTime, startTime);
          const scheduledHours = scheduledMinutes / 60;
          
          // Find matching attendance log
          const attendanceLog = attendanceLogs?.find(
            log => log.staff_id === employee.id && log.shift_id === shift.id
          );

          let actualHours = 0;
          let isLate = false;
          let lateMinutes = 0;
          let autoClockedOut = false;

          if (attendanceLog) {
            isLate = attendanceLog.is_late || false;
            lateMinutes = attendanceLog.late_minutes || 0;
            autoClockedOut = attendanceLog.auto_clocked_out || false;
            
            if (attendanceLog.check_out_at) {
              const checkIn = new Date(attendanceLog.check_in_at);
              const checkOut = new Date(attendanceLog.check_out_at);
              actualHours = differenceInMinutes(checkOut, checkIn) / 60;
            }
          }

          const hourlyRate = employee.hourly_rate || 0;
          const locationData = shift.locations as any;
          const requiresCheckin = locationData?.requires_checkin || false;
          
          // Determine if shift was missed (no attendance when check-in required)
          const isMissed = requiresCheckin && !attendanceLog;
          
          // Pay based on actual hours worked, or scheduled if no check-in required and no attendance
          // If missed (check-in required but no attendance), pay is 0
          let dailyAmount = 0;
          if (isMissed) {
            dailyAmount = 0; // No pay for missed shifts
          } else if (actualHours > 0) {
            dailyAmount = actualHours * hourlyRate;
          } else {
            dailyAmount = scheduledHours * hourlyRate;
          }

          payrollEntries.push({
            employee_id: employee.id,
            employee_name: employee.full_name,
            role: employee.role || shift.role,
            date: shift.shift_date,
            scheduled_hours: scheduledHours,
            actual_hours: actualHours,
            hourly_rate: hourlyRate,
            daily_amount: dailyAmount,
            shift_id: shift.id,
            location_id: shift.location_id,
            location_name: locationData?.name || 'Unknown',
            is_late: isLate,
            late_minutes: lateMinutes,
            auto_clocked_out: autoClockedOut,
            requires_checkin: requiresCheckin,
            is_missed: isMissed,
          });
        }
      }

      return payrollEntries;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Aggregate payroll by employee with overtime/undertime
export const usePayrollSummary = (startDate?: string, endDate?: string, locationId?: string) => {
  const { data: entries = [], isLoading } = usePayrollFromShifts(startDate, endDate, locationId);

  // Calculate weeks in period
  const weeksInPeriod = startDate && endDate 
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : 1;

  const summary = entries.reduce((acc, entry) => {
    const existing = acc.find(e => e.employee_id === entry.employee_id);
    if (existing) {
      existing.scheduled_hours += entry.scheduled_hours;
      existing.actual_hours += entry.actual_hours;
      existing.total_amount += entry.daily_amount;
      existing.days_worked += 1;
      if (entry.is_late) {
        existing.late_count += 1;
        existing.total_late_minutes += entry.late_minutes;
      }
    } else {
      acc.push({
        employee_id: entry.employee_id,
        employee_name: entry.employee_name,
        role: entry.role,
        hourly_rate: entry.hourly_rate,
        scheduled_hours: entry.scheduled_hours,
        actual_hours: entry.actual_hours,
        overtime_hours: 0,
        undertime_hours: 0,
        total_amount: entry.daily_amount,
        days_worked: 1,
        late_count: entry.is_late ? 1 : 0,
        total_late_minutes: entry.late_minutes,
        expected_weekly_hours: (entry as any).expected_weekly_hours || null,
        expected_shifts_per_week: (entry as any).expected_shifts_per_week || null,
        extra_shifts: 0,
        missing_shifts: 0,
      });
    }
    return acc;
  }, [] as PayrollSummaryItem[]);

  // Calculate overtime/undertime and extra/missing shifts for each employee
  summary.forEach(item => {
    const diff = item.actual_hours - item.scheduled_hours;
    if (diff > 0) {
      item.overtime_hours = diff;
    } else if (diff < 0 && item.actual_hours > 0) {
      item.undertime_hours = Math.abs(diff);
    }
    
    // Calculate extra/missing shifts based on expected shifts per week
    if (item.expected_shifts_per_week) {
      const expectedShiftsForPeriod = item.expected_shifts_per_week * weeksInPeriod;
      const shiftDiff = item.days_worked - expectedShiftsForPeriod;
      if (shiftDiff > 0) {
        item.extra_shifts = shiftDiff;
      } else if (shiftDiff < 0) {
        item.missing_shifts = Math.abs(shiftDiff);
      }
    }
  });

  // Aggregate by location
  const locationSummary = entries.reduce((acc, entry) => {
    const existing = acc.find(l => l.location_id === entry.location_id);
    if (existing) {
      existing.total_hours += entry.actual_hours || entry.scheduled_hours;
      existing.total_amount += entry.daily_amount;
      existing.shift_count += 1;
    } else {
      acc.push({
        location_id: entry.location_id,
        location_name: entry.location_name,
        total_hours: entry.actual_hours || entry.scheduled_hours,
        total_amount: entry.daily_amount,
        shift_count: 1,
      });
    }
    return acc;
  }, [] as Array<{
    location_id: string;
    location_name: string;
    total_hours: number;
    total_amount: number;
    shift_count: number;
  }>);

  return { data: summary, entries, locationSummary, isLoading, weeksInPeriod };
};

export const useCreatePayrollPeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (period: Omit<PayrollPeriod, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ ...period, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      toast.success("Payroll period created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create payroll period: " + error.message);
    },
  });
};
