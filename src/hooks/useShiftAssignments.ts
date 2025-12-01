import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  staff_id: string;
  status: string;
  assigned_at: string;
  assigned_by: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  employees?: {
    full_name: string;
    role: string;
  };
  shifts?: {
    role: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    location_id?: string;
    locations?: {
      name: string;
    };
  };
}

export const useShiftAssignments = (shiftId?: string) => {
  return useQuery({
    queryKey: ["shift-assignments", shiftId],
    queryFn: async () => {
      let query = supabase
        .from("shift_assignments")
        .select(`
          *,
          employees(full_name, role),
          shifts(role, shift_date, start_time, end_time)
        `);
      
      if (shiftId) {
        query = query.eq("shift_id", shiftId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ShiftAssignment[];
    },
    enabled: !!shiftId,
  });
};

export const useApproveShiftAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("shift_assignments")
        .update({ 
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Shift assignment approved");
    },
    onError: (error) => {
      toast.error("Failed to approve: " + error.message);
    },
  });
};

export const useRejectShiftAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("shift_assignments")
        .delete()
        .eq("id", assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Shift assignment rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject: " + error.message);
    },
  });
};

export const usePendingApprovals = () => {
  return useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_assignments")
        .select(`
          *,
          employees(full_name, role),
          shifts(role, shift_date, start_time, end_time, location_id, locations(name))
        `)
        .eq("approval_status", "pending")
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      return data as ShiftAssignment[];
    },
  });
};

export const useCreateShiftAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shift_id, employee_id }: { shift_id: string; employee_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("shift_assignments")
        .insert({ 
          shift_id, 
          staff_id: employee_id, 
          assigned_by: user.id,
          status: "assigned"
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (error) => {
      toast.error("Failed to assign employee: " + error.message);
    },
  });
};

export const useAssignStaffToShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: string; staffId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("shift_assignments")
        .insert({ 
          shift_id: shiftId, 
          staff_id: staffId, 
          assigned_by: user.id,
          status: "assigned"
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      toast.success("Staff assigned to shift");
    },
    onError: (error) => {
      toast.error("Failed to assign staff: " + error.message);
    },
  });
};

export const useUnassignStaffFromShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("shift_assignments")
        .delete()
        .eq("id", assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      toast.success("Staff unassigned from shift");
    },
    onError: (error) => {
      toast.error("Failed to unassign staff: " + error.message);
    },
  });
};
