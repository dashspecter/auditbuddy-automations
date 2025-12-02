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
      
      console.log("[Approve] Starting approval process for assignment:", assignmentId);
      
      // Get the assignment details to check for overlaps
      const { data: assignment, error: fetchError } = await supabase
        .from("shift_assignments")
        .select(`
          staff_id,
          shifts!inner(id, shift_date, start_time, end_time, role, location_id, locations(name, company_id)),
          employees!inner(full_name, company_id)
        `)
        .eq("id", assignmentId)
        .single();
      
      if (fetchError) {
        console.error("[Approve] Failed to fetch assignment:", fetchError);
        throw fetchError;
      }
      
      const shift = (assignment as any).shifts;
      const employee = (assignment as any).employees;
      
      console.log("[Approve] Assignment details:", {
        employee: employee.full_name,
        shift_date: shift.shift_date,
        time: `${shift.start_time} - ${shift.end_time}`,
        role: shift.role
      });
      
      // Check for overlapping approved shifts on the same date
      const { data: existingAssignments, error: checkError } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          shift_id,
          shifts!inner(id, shift_date, start_time, end_time)
        `)
        .eq("staff_id", assignment.staff_id)
        .eq("approval_status", "approved")
        .neq("id", assignmentId);
      
      if (checkError) {
        console.error("[Approve] Failed to check existing assignments:", checkError);
        throw checkError;
      }
      
      console.log("[Approve] Found existing approved assignments:", existingAssignments?.length || 0);
      
      // Filter by date and check for time overlaps in JavaScript for accuracy
      if (existingAssignments && existingAssignments.length > 0) {
        const newStart = shift.start_time;
        const newEnd = shift.end_time;
        const newDate = shift.shift_date;
        
        for (const existing of existingAssignments) {
          const existingShift = (existing as any).shifts;
          
          // Only check shifts on the same date
          if (existingShift.shift_date !== newDate) continue;
          
          const existingStart = existingShift.start_time;
          const existingEnd = existingShift.end_time;
          
          console.log("[Approve] Checking conflict:", {
            existing: `${existingStart} - ${existingEnd}`,
            new: `${newStart} - ${newEnd}`
          });
          
          // Check if times overlap
          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            console.log("[Approve] CONFLICT DETECTED! Deleting assignment:", assignmentId);
            
            // Delete the conflicting assignment first
            const { data: deleteData, error: deleteError } = await supabase
              .from("shift_assignments")
              .delete()
              .eq("id", assignmentId)
              .select();
            
            if (deleteError) {
              console.error("[Approve] FAILED to delete conflicting assignment:", deleteError);
              throw new Error(`Failed to remove conflicting shift: ${deleteError.message}`);
            }
            
            console.log("[Approve] Successfully deleted assignment. Deleted rows:", deleteData);
            
            // Immediately invalidate queries after successful deletion
            await queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
            await queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
            
            // Try to create an alert for the employee (non-blocking)
            try {
              const alertResult = await supabase
                .from("alerts")
                .insert({
                  company_id: employee.company_id,
                  title: "Shift Assignment Rejected - Schedule Conflict",
                  message: `Your shift assignment for ${shift.role} on ${new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}) at ${shift.locations.name} was automatically rejected due to a schedule conflict with another approved shift.`,
                  severity: "warning",
                  category: "staff",
                  source: "shift_assignments",
                  source_reference_id: assignmentId,
                  metadata: {
                    shift_date: shift.shift_date,
                    role: shift.role,
                    location_name: shift.locations.name,
                    staff_id: assignment.staff_id,
                    employee_name: employee.full_name,
                    reason: "schedule_conflict"
                  }
                });
              if (alertResult.error) {
                console.error("[Approve] Failed to create conflict alert:", alertResult.error);
              } else {
                console.log("[Approve] Conflict alert created");
              }
            } catch (alertError) {
              console.error("[Approve] Exception creating conflict alert:", alertError);
            }
            
            throw new Error(`Cannot approve: Employee already has an approved shift from ${existingStart.slice(0, 5)} to ${existingEnd.slice(0, 5)} on this date`);
          }
        }
      }
      
      console.log("[Approve] No conflicts found, proceeding with approval");
      
      const { error } = await supabase
        .from("shift_assignments")
        .update({ 
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", assignmentId);
      
      if (error) {
        console.error("[Approve] Failed to update approval status:", error);
        throw error;
      }
      
      console.log("[Approve] Successfully approved assignment");
    },
    onSuccess: () => {
      // Force refetch all related queries
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-working-staff"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
      toast.success("Shift assignment approved");
    },
    onError: (error) => {
      // Also invalidate on error since we may have deleted a conflicting shift
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-working-staff"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
      toast.error("Failed to approve: " + error.message);
    },
  });
};

export const useRejectShiftAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get assignment details before deleting
      const { data: assignment, error: fetchError } = await supabase
        .from("shift_assignments")
        .select(`
          staff_id,
          shifts!inner(
            shift_date,
            start_time,
            end_time,
            role,
            location_id,
            locations(name, company_id)
          ),
          employees!inner(full_name, company_id)
        `)
        .eq("id", assignmentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const shift = (assignment as any).shifts;
      const employee = (assignment as any).employees;
      const location = shift.locations;
      
      // Delete the assignment first
      const { error: deleteError } = await supabase
        .from("shift_assignments")
        .delete()
        .eq("id", assignmentId);
      
      if (deleteError) throw deleteError;
      
      // Try to create alert for the employee (don't fail if this doesn't work)
      try {
        await supabase
          .from("alerts")
          .insert({
            company_id: employee.company_id,
            title: "Shift Assignment Rejected",
            message: `Your shift assignment for ${shift.role} on ${new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}) at ${location.name} has been rejected by management.`,
            severity: "warning",
            category: "staff",
            source: "shift_assignments",
            source_reference_id: assignmentId,
            metadata: {
              shift_date: shift.shift_date,
              role: shift.role,
              location_name: location.name,
              staff_id: assignment.staff_id,
              employee_name: employee.full_name
            }
          });
      } catch (alertError) {
        console.error("Failed to create alert for rejected shift:", alertError);
        // Continue anyway - the shift is already deleted
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-working-staff"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
      toast.success("Shift assignment rejected and employee notified");
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
