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
  employees?: {
    full_name: string;
    role: string;
  };
}

export const useShiftAssignments = (shiftId?: string) => {
  return useQuery({
    queryKey: ["shift-assignments", shiftId],
    queryFn: async () => {
      let query = supabase
        .from("shift_assignments")
        .select("*, employees(full_name, role)");
      
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
