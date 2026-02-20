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
      
      // Call the database function to approve the shift assignment
      const { data, error: rpcError } = await supabase.rpc('approve_shift_assignment', {
        assignment_id: assignmentId
      });
      
      if (rpcError) {
        console.error("[Approve] Function call FAILED:", rpcError);
        throw rpcError;
      }
      
      
      const result = data as { status: string; message: string };
      
      // Create alert for conflict if needed
      if (result.status === 'rejected_conflict') {
        // The function already deleted the assignment
        // No need to create an alert here as it's already handled
      }
      
      return result;
    },
    onSuccess: (result) => {
      
      // Use Promise.all to ensure all invalidations complete together
      Promise.all([
        queryClient.resetQueries({ queryKey: ["pending-approvals"] }),
        queryClient.resetQueries({ queryKey: ["shift-assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["today-working-staff"] }),
        queryClient.invalidateQueries({ queryKey: ["team-stats"] })
      ]).then(() => {
        
      });
      
      if (result?.status === 'rejected_conflict') {
        toast.error(result.message);
      } else {
        toast.success("Shift assignment approved");
      }
    },
    onError: (error: any) => {
      console.error("[Approve] onError:", error);
      // Also invalidate on error since we may have deleted a conflicting shift
      Promise.all([
        queryClient.resetQueries({ queryKey: ["pending-approvals"] }),
        queryClient.resetQueries({ queryKey: ["shift-assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["today-working-staff"] }),
        queryClient.invalidateQueries({ queryKey: ["team-stats"] })
      ]);
      
      // Only show error toast if it's not already handled
      if (!error.message?.includes('already has an approved shift')) {
        toast.error("Failed to approve: " + error.message);
      }
    },
  });
};

export const useRejectShiftAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      console.log("[Reject] MUTATION FUNCTION CALLED for:", assignmentId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("[Reject] No authenticated user!");
        throw new Error("Not authenticated");
      }
      console.log("[Reject] User authenticated:", user.id);
      
      // Call the database function to reject the shift assignment
      console.log("[Reject] Calling reject_shift_assignment function");
      const { data, error: rpcError } = await supabase.rpc('reject_shift_assignment', {
        assignment_id: assignmentId
      });
      
      if (rpcError) {
        console.error("[Reject] Function call FAILED:", rpcError);
        throw rpcError;
      }
      
      console.log("[Reject] Function call SUCCESS. Returned data:", data);
      const assignmentData = data as any;
      
      // Try to create alert for the employee (don't fail if this doesn't work)
      if (assignmentData) {
        try {
          console.log("[Reject] Creating alert for employee");
          const alertResult = await supabase
            .from("alerts")
            .insert({
              company_id: assignmentData.company_id,
              title: "Shift Assignment Rejected",
              message: `Your shift assignment for ${assignmentData.role} on ${new Date(assignmentData.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (${assignmentData.start_time.slice(0, 5)} - ${assignmentData.end_time.slice(0, 5)}) at ${assignmentData.location_name} has been rejected by management.`,
              severity: "warning",
              category: "staff",
              source: "shift_assignments",
              source_reference_id: assignmentId,
              metadata: {
                shift_date: assignmentData.shift_date,
                role: assignmentData.role,
                location_name: assignmentData.location_name,
                staff_id: assignmentData.staff_id,
                employee_name: assignmentData.employee_name
              }
            });
          
          if (alertResult.error) {
            console.error("[Reject] Alert creation failed:", alertResult.error);
          } else {
            console.log("[Reject] Alert created successfully");
          }
        } catch (alertError) {
          console.error("[Reject] Exception creating alert:", alertError);
        }
      }
      
      console.log("[Reject] Rejection complete");
    },
    onSuccess: () => {
      console.log("[Reject] onSuccess - resetting and invalidating queries");
      // Use Promise.all to ensure all invalidations complete together
      Promise.all([
        queryClient.resetQueries({ queryKey: ["pending-approvals"] }),
        queryClient.resetQueries({ queryKey: ["shift-assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["today-working-staff"] }),
        queryClient.invalidateQueries({ queryKey: ["team-stats"] })
      ]).then(() => {
        console.log("[Reject] All queries invalidated successfully");
      });
      toast.success("Shift assignment rejected and employee notified");
    },
    onError: (error) => {
      console.error("[Reject] onError:", error);
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
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
      
      // Get the shift details to check time
      const { data: shiftData, error: shiftError } = await supabase
        .from("shifts")
        .select("shift_date, start_time, end_time")
        .eq("id", shift_id)
        .single();
      
      if (shiftError) throw shiftError;
      
      // Check for overlapping shifts for this employee
      const { data: existingAssignments, error: checkError } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          shifts!inner(shift_date, start_time, end_time)
        `)
        .eq("staff_id", employee_id)
        .eq("shifts.shift_date", shiftData.shift_date)
        .neq("approval_status", "rejected");
      
      if (checkError) throw checkError;
      
      // Check for time overlaps
      if (existingAssignments && existingAssignments.length > 0) {
        const newStart = shiftData.start_time;
        const newEnd = shiftData.end_time;
        
        for (const assignment of existingAssignments) {
          const existingShift = (assignment as any).shifts;
          const existingStart = existingShift.start_time;
          const existingEnd = existingShift.end_time;
          
          // Check if times overlap
          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            throw new Error(`This employee already has a shift from ${existingStart} to ${existingEnd} on this date`);
          }
        }
      }
      
      // When a manager assigns directly, auto-approve the assignment
      const { data, error } = await supabase
        .from("shift_assignments")
        .insert({ 
          shift_id, 
          staff_id: employee_id, 
          assigned_by: user.id,
          status: "assigned",
          approval_status: "approved",
          approved_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });

      // Fire-and-forget WhatsApp notification for shift assignment
      if (data?.staff_id) {
        // Get shift details for the notification
        (async () => {
          try {
            const { data: shift } = await supabase
              .from("shifts")
              .select("shift_date, start_time, end_time, company_id")
              .eq("id", variables.shift_id)
              .single();
            if (shift?.company_id) {
              await supabase.functions.invoke("send-whatsapp", {
                body: {
                  company_id: shift.company_id,
                  employee_id: data.staff_id,
                  template_name: "shift_assigned",
                  variables: {
                    shift_date: shift.shift_date,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                  },
                  event_type: "shift_published",
                  event_ref_id: variables.shift_id,
                },
              });
            }
          } catch {}
        })();
      }
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
      
      // Get the shift details to check time
      const { data: shiftData, error: shiftError } = await supabase
        .from("shifts")
        .select("shift_date, start_time, end_time")
        .eq("id", shiftId)
        .single();
      
      if (shiftError) throw shiftError;
      
      // Check for overlapping shifts for this employee
      const { data: existingAssignments, error: checkError } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          shifts!inner(shift_date, start_time, end_time)
        `)
        .eq("staff_id", staffId)
        .eq("shifts.shift_date", shiftData.shift_date)
        .neq("approval_status", "rejected");
      
      if (checkError) throw checkError;
      
      // Check for time overlaps
      if (existingAssignments && existingAssignments.length > 0) {
        const newStart = shiftData.start_time;
        const newEnd = shiftData.end_time;
        
        for (const assignment of existingAssignments) {
          const existingShift = (assignment as any).shifts;
          const existingStart = existingShift.start_time;
          const existingEnd = existingShift.end_time;
          
          // Check if times overlap
          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            throw new Error(`This employee already has a shift from ${existingStart} to ${existingEnd} on this date`);
          }
        }
      }
      
      // When a manager assigns directly, auto-approve the assignment
      const { data, error } = await supabase
        .from("shift_assignments")
        .insert({ 
          shift_id: shiftId, 
          staff_id: staffId, 
          assigned_by: user.id,
          status: "assigned",
          approval_status: "approved",
          approved_at: new Date().toISOString()
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
