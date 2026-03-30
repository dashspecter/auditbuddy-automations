import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  request_type: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  employees?: {
    full_name: string;
    avatar_url: string | null;
  };
  time_off_request_dates?: Array<{ date: string }>;
}

export const useTimeOffRequests = (startDate?: string, endDate?: string, employeeId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["time-off-requests", startDate, endDate, employeeId],
    enabled,
    queryFn: async () => {
      let query = supabase
        .from("time_off_requests")
        .select("*, employees(full_name, avatar_url), time_off_request_dates(date)")
        .order("start_date", { ascending: true });
      
      if (startDate && endDate) {
        // Overlap logic: fetch any request that touches the displayed period
        query = query.lte("start_date", endDate).gte("end_date", startDate);
      } else if (startDate) {
        query = query.gte("end_date", startDate);
      } else if (endDate) {
        query = query.lte("start_date", endDate);
      }
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as TimeOffRequest[];
    },
  });
};

export const useTimeOffRequestDates = (requestId?: string) => {
  return useQuery({
    queryKey: ["time-off-request-dates", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off_request_dates")
        .select("date")
        .eq("request_id", requestId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data.map(d => d.date);
    },
  });
};

export const useCreateTimeOffRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      employee_id: string;
      start_date: string;
      end_date: string;
      status: string;
      reason: string | null;
      request_type: string | null;
      rejection_reason: string | null;
      selected_dates?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { selected_dates, ...requestData } = request;
      
      const insertData: any = { 
        ...requestData, 
        company_id: companyUser.company_id 
      };
      
      if (request.status === 'approved') {
        insertData.approved_by = user.id;
        insertData.approved_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from("time_off_requests")
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      // Insert individual date rows
      const datesToInsert = selected_dates && selected_dates.length > 0
        ? selected_dates
        : generateDateRange(request.start_date, request.end_date);

      if (datesToInsert.length > 0) {
        const dateRows = datesToInsert.map(d => ({
          request_id: data.id,
          date: d,
          company_id: companyUser.company_id,
        }));
        const { error: datesError } = await supabase
          .from("time_off_request_dates")
          .insert(dateRows);
        if (datesError) throw datesError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["time-off-request-dates"] });
      toast.success("Time off request created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create time off request: " + error.message);
    },
  });
};

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export const useUpdateTimeOffRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, selected_dates, ...updates }: Partial<TimeOffRequest> & { id: string; selected_dates?: string[] }) => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // If selected_dates provided, replace child rows
      if (selected_dates) {
        // Delete existing
        await supabase
          .from("time_off_request_dates")
          .delete()
          .eq("request_id", id);

        // Insert new
        if (selected_dates.length > 0) {
          const { error: datesError } = await supabase
            .from("time_off_request_dates")
            .insert(selected_dates.map(d => ({
              request_id: id,
              date: d,
              company_id: data.company_id,
            })));
          if (datesError) throw datesError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["time-off-request-dates"] });
      toast.success("Time off request updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update time off request: " + error.message);
    },
  });
};

export const useDeleteTimeOffRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("time_off_requests")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["time-off-request-dates"] });
      toast.success("Time off removed successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove time off: " + error.message);
    },
  });
};
