import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Shift {
  id: string;
  company_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  required_count: number;
  notes: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string | null;
  is_published?: boolean;
  is_open_shift?: boolean;
  close_duty?: boolean;
  break_duration_minutes?: number;
  breaks?: Array<{ start: string; end: string }>;
  locations?: {
    name: string;
  };
  shift_assignments?: Array<{
    id: string;
    staff_id: string;
    shift_id: string;
    approval_status: string;
  }>;
}

export const useShifts = (locationId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["shifts", locationId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select(`
          *,
          locations(name),
          shift_assignments(id, staff_id, shift_id, approval_status)
        `)
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      if (startDate) {
        query = query.gte("shift_date", startDate);
      }
      if (endDate) {
        query = query.lte("shift_date", endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[]).map((shift: any) => ({
        ...shift,
        breaks: (shift.breaks || []) as Array<{ start: string; end: string }>,
        shift_assignments: shift.shift_assignments || []
      })) as Shift[];
    },
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shift: Omit<Shift, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const creatorName = user.user_metadata?.full_name || user.email || 'Unknown';
      
      const { data, error } = await supabase
        .from("shifts")
        .insert({ 
          ...shift, 
          created_by: user.id, 
          company_id: companyUser.company_id,
          creator_name: creatorName
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create shift: " + error.message);
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shift> & { id: string }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update shift: " + error.message);
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete shift: " + error.message);
    },
  });
};

export const useBulkPublishShifts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftIds, publish = true }: { shiftIds: string[]; publish?: boolean }) => {
      if (shiftIds.length === 0) return;
      
      const { error } = await supabase
        .from("shifts")
        .update({ is_published: publish })
        .in("id", shiftIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      const action = variables.publish ? "published" : "unpublished";
      toast.success(`${variables.shiftIds.length} shift(s) ${action} successfully`);
    },
    onError: (error) => {
      toast.error("Failed to publish shifts: " + error.message);
    },
  });
};
