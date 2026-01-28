import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getToastError } from "@/lib/errorMessages";

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
  shift_type?: 'regular' | 'training' | null;
  training_session_id?: string | null;
  training_module_id?: string | null;
  trainer_employee_id?: string | null;
  cohort_label?: string | null;
  locations?: {
    name: string;
  };
  shift_assignments?: Array<{
    id: string;
    staff_id: string;
    shift_id: string;
    approval_status: string;
  }>;
  training_session?: {
    id: string;
    title: string | null;
    trainer?: { id: string; full_name: string } | null;
    attendees?: Array<{
      id: string;
      employee_id: string;
      attendee_role: string;
      employee?: { id: string; full_name: string };
    }>;
  } | null;
  training_module?: {
    id: string;
    name: string;
  } | null;
}

export const useShifts = (locationId?: string, startDate?: string, endDate?: string, shiftTypeFilter?: 'all' | 'regular' | 'training') => {
  return useQuery({
    queryKey: ["shifts", locationId, startDate, endDate, shiftTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select(`
          *,
          locations(name),
          shift_assignments(id, staff_id, shift_id, approval_status),
          training_session:training_sessions(
            id,
            title,
            trainer:employees!training_sessions_trainer_employee_id_fkey(id, full_name),
            attendees:training_session_attendees(
              id,
              employee_id,
              attendee_role,
              employee:employees(id, full_name)
            )
          ),
          training_module:training_programs(id, name)
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
      
      // Filter by shift type
      if (shiftTypeFilter === 'regular') {
        query = query.or('shift_type.eq.regular,shift_type.is.null');
      } else if (shiftTypeFilter === 'training') {
        query = query.eq('shift_type', 'training');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[]).map((shift: any) => ({
        ...shift,
        breaks: (shift.breaks || []) as Array<{ start: string; end: string }>,
        shift_assignments: shift.shift_assignments || [],
        training_session: shift.training_session || null,
        training_module: shift.training_module || null,
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
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
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
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
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
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
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
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};
