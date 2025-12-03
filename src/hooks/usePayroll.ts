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
  hours: number;
  hourly_rate: number;
  daily_amount: number;
  shift_id: string;
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

// Calculate payroll from shifts data
export const usePayrollFromShifts = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["payroll-from-shifts", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      // Get shifts within the date range with their assignments
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select(`
          id,
          shift_date,
          start_time,
          end_time,
          role,
          location_id,
          shift_assignments!inner(
            id,
            staff_id,
            approval_status,
            employees!inner(
              id,
              full_name,
              role,
              hourly_rate
            )
          )
        `)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .eq("shift_assignments.approval_status", "approved");

      if (shiftsError) throw shiftsError;

      // Calculate daily payroll entries
      const payrollEntries: DailyPayrollEntry[] = [];

      for (const shift of shifts || []) {
        for (const assignment of shift.shift_assignments || []) {
          const employee = assignment.employees;
          if (!employee) continue;

          // Calculate hours from shift times
          const startTime = parseISO(`${shift.shift_date}T${shift.start_time}`);
          let endTime = parseISO(`${shift.shift_date}T${shift.end_time}`);
          
          // Handle overnight shifts
          if (endTime <= startTime) {
            endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
          }
          
          const minutes = differenceInMinutes(endTime, startTime);
          const hours = minutes / 60;
          const hourlyRate = employee.hourly_rate || 0;
          const dailyAmount = hours * hourlyRate;

          payrollEntries.push({
            employee_id: employee.id,
            employee_name: employee.full_name,
            role: employee.role || shift.role,
            date: shift.shift_date,
            hours,
            hourly_rate: hourlyRate,
            daily_amount: dailyAmount,
            shift_id: shift.id,
          });
        }
      }

      return payrollEntries;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Aggregate payroll by employee
export const usePayrollSummary = (startDate?: string, endDate?: string) => {
  const { data: entries = [], isLoading } = usePayrollFromShifts(startDate, endDate);

  const summary = entries.reduce((acc, entry) => {
    const existing = acc.find(e => e.employee_id === entry.employee_id);
    if (existing) {
      existing.total_hours += entry.hours;
      existing.total_amount += entry.daily_amount;
      existing.days_worked += 1;
    } else {
      acc.push({
        employee_id: entry.employee_id,
        employee_name: entry.employee_name,
        role: entry.role,
        hourly_rate: entry.hourly_rate,
        total_hours: entry.hours,
        total_amount: entry.daily_amount,
        days_worked: 1,
      });
    }
    return acc;
  }, [] as Array<{
    employee_id: string;
    employee_name: string;
    role: string;
    hourly_rate: number;
    total_hours: number;
    total_amount: number;
    days_worked: number;
  }>);

  return { data: summary, entries, isLoading };
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
