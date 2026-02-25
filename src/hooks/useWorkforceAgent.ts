import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";

// Types
export interface Timesheet {
  id: string;
  employee_id: string;
  company_id: string;
  location_id: string;
  date: string;
  shift_start: string | null;
  shift_end: string | null;
  hours_worked: number;
  overtime_hours: number;
  anomalies_json: string[];
  status: "pending" | "approved" | "rejected" | "processed";
  created_at: string;
  updated_at: string;
}

export interface PayrollBatch {
  id: string;
  company_id: string;
  location_id: string | null;
  period_start: string;
  period_end: string;
  status: "draft" | "pending_approval" | "approved" | "processed" | "paid";
  summary_json: PayrollSummary;
  created_by_agent: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollSummary {
  employee_count: number;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_anomalies: number;
  employee_summaries: EmployeeSummary[];
}

export interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  total_hours: number;
  overtime_hours: number;
  regular_hours: number;
  days_worked: number;
  anomalies: string[];
}

export interface AttendanceAlert {
  id: string;
  company_id: string;
  location_id: string | null;
  employee_id: string | null;
  date: string;
  alert_type: string;
  details_json: Record<string, unknown>;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
}

export interface SchedulingInsight {
  type: "understaffing" | "overstaffing" | "mismatch" | "pattern";
  severity: "high" | "medium" | "low";
  location_id: string;
  date: string;
  message: string;
  details: Record<string, unknown>;
}

// Timesheets Hooks
export function useTimesheets(filters?: { employeeId?: string; status?: string; startDate?: string; endDate?: string }) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["timesheets", company?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("timesheets")
        .select("*, employee:employee_id(full_name), location:location_id(name)")
        .eq("company_id", company?.id)
        .order("date", { ascending: false });

      if (filters?.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Timesheet & { employee: { full_name: string }; location: { name: string } })[];
    },
    enabled: !!company?.id,
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Timesheet> & { id: string }) => {
      const { data, error } = await supabase
        .from("timesheets")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

// Payroll Batches Hooks
export function usePayrollBatches(status?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["payroll-batches", company?.id, status],
    queryFn: async () => {
      let query = supabase
        .from("payroll_batches")
        .select("*")
        .eq("company_id", company?.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PayrollBatch[];
    },
    enabled: !!company?.id,
  });
}

export function usePayrollBatchDetail(id: string) {
  return useQuery({
    queryKey: ["payroll-batch-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_batches")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as PayrollBatch;
    },
    enabled: !!id,
  });
}

export function useUpdatePayrollBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayrollBatch> & { id: string }) => {
      const { data, error } = await supabase
        .from("payroll_batches")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
    },
  });
}

// Attendance Alerts Hooks
export function useAttendanceAlerts(filters?: { status?: string; employeeId?: string; locationId?: string; startDate?: string; endDate?: string }) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["attendance-alerts", company?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("attendance_alerts")
        .select("*, employee:employee_id(full_name), location:location_id(name)")
        .eq("company_id", company?.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (AttendanceAlert & { employee: { full_name: string } | null; location: { name: string } | null })[];
    },
    enabled: !!company?.id,
  });
}

export function useUpdateAttendanceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceAlert> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from("attendance_alerts")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
    },
  });
}

// Agent Actions
export function useRunWorkforceAgent() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, goal, mode }: { locationId?: string; goal?: string; mode?: string }) => {
      const { data, error } = await supabase.functions.invoke("workforce-agent", {
        body: {
          action: "run",
          company_id: company?.id,
          location_id: locationId,
          goal,
          mode: mode || "simulate",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function usePreparePayroll() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodStart, periodEnd, locationId }: { periodStart: string; periodEnd: string; locationId?: string }) => {
      const { data, error } = await supabase.functions.invoke("workforce-agent", {
        body: {
          action: "prepare-payroll",
          company_id: company?.id,
          period_start: periodStart,
          period_end: periodEnd,
          ...(locationId && locationId !== "__all__" ? { location_id: locationId } : {}),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useAnalyzeScheduling() {
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async ({ locationId, startDate, endDate }: { locationId: string; startDate: string; endDate: string }) => {
      const { data, error } = await supabase.functions.invoke("workforce-agent", {
        body: {
          action: "analyze-scheduling",
          company_id: company?.id,
          location_id: locationId,
          start_date: startDate,
          end_date: endDate,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useDetectAttendanceRisks() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lookbackDays = 30 }: { lookbackDays?: number } = {}) => {
      const { data, error } = await supabase.functions.invoke("workforce-agent", {
        body: {
          action: "detect-attendance-risks",
          company_id: company?.id,
          lookback_days: lookbackDays,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
    },
  });
}
