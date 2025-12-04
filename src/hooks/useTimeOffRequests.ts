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
}

export const useTimeOffRequests = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["time-off-requests", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("time_off_requests")
        .select("*, employees(full_name, avatar_url)")
        .order("start_date", { ascending: true });
      
      if (startDate) {
        query = query.gte("start_date", startDate);
      }
      if (endDate) {
        query = query.lte("end_date", endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as TimeOffRequest[];
    },
  });
};

export const useCreateTimeOffRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: Omit<TimeOffRequest, "id" | "created_at" | "updated_at" | "company_id" | "approved_by" | "approved_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("time_off_requests")
        .insert({ ...request, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      toast.success("Time off request created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create time off request: " + error.message);
    },
  });
};

export const useUpdateTimeOffRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimeOffRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
      toast.success("Time off request updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update time off request: " + error.message);
    },
  });
};