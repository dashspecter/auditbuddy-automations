import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompanyContext } from "@/contexts/CompanyContext";

export interface AttendanceLog {
  id: string;
  staff_id: string;
  location_id: string;
  shift_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  method: string;
  device_info: any;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  is_late?: boolean;
  late_minutes?: number;
  expected_clock_in?: string;
  auto_clocked_out?: boolean;
  employees?: {
    full_name: string;
    role: string;
  };
  locations?: {
    name: string;
  };
  shifts?: {
    start_time: string;
    end_time: string;
    role: string;
  };
}

export const useAttendanceLogs = (locationId?: string, date?: string, endDate?: string) => {
  const { company } = useCompanyContext();
  
  return useQuery({
    queryKey: ["attendance-logs", company?.id, locationId, date, endDate],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Get employee IDs for this company first
      const { data: companyEmployees } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", company.id);
      
      if (!companyEmployees || companyEmployees.length === 0) return [];
      
      const employeeIds = companyEmployees.map(e => e.id);
      
      let query = supabase
        .from("attendance_logs")
        .select("*, employees(full_name, role), locations(name), shifts(start_time, end_time, role)")
        .in("staff_id", employeeIds)
        .order("check_in_at", { ascending: false });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        if (endDate) {
          // Date range query
          const endOfRange = new Date(endDate);
          endOfRange.setHours(23, 59, 59, 999);
          query = query
            .gte("check_in_at", startOfDay.toISOString())
            .lte("check_in_at", endOfRange.toISOString());
        } else {
          // Single date query
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          query = query
            .gte("check_in_at", startOfDay.toISOString())
            .lte("check_in_at", endOfDay.toISOString());
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceLog[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateAttendanceLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (log: Omit<AttendanceLog, "id" | "created_at" | "approved_by" | "approved_at">) => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .insert(log)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-logs"] });
      toast.success("Attendance logged successfully");
    },
    onError: (error) => {
      toast.error("Failed to log attendance: " + error.message);
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .update({ check_out_at: new Date().toISOString() })
        .eq("id", logId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-logs"] });
      toast.success("Checked out successfully");
    },
    onError: (error) => {
      toast.error("Failed to check out: " + error.message);
    },
  });
};
