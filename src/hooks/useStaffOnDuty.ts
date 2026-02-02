import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StaffOnDutyResult {
  isOnDuty: boolean;
  locationId: string | null;
  reason: "clocked_in" | "has_approved_shift_today" | "no_shift" | "not_approved" | "loading";
  shiftLocationName?: string;
}

/**
 * Determines if the current staff member is "on duty" for wastage and other in-location features.
 * 
 * On duty means:
 * 1. Currently clocked in (has open attendance log), OR
 * 2. Has an approved shift for today at any location
 */
export function useStaffOnDuty(): StaffOnDutyResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-on-duty", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get employee record
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, company_id, location_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empError || !employee) {
        console.error("[useStaffOnDuty] Failed to fetch employee:", empError);
        return null;
      }

      const today = new Date().toISOString().split("T")[0];

      // Check 1: Is the user currently clocked in?
      const { data: openAttendance } = await supabase
        .from("attendance_logs")
        .select("id, location_id, locations(name)")
        .eq("staff_id", employee.id)
        .is("check_out_at", null)
        .order("check_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openAttendance) {
        return {
          isOnDuty: true,
          locationId: openAttendance.location_id,
          shiftLocationName: (openAttendance.locations as any)?.name,
          reason: "clocked_in" as const,
        };
      }

      // Check 2: Has approved shift today
      const { data: assignments } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          approval_status,
          shifts:shift_id (
            shift_date,
            location_id,
            locations:location_id (name)
          )
        `)
        .eq("staff_id", employee.id)
        .in("approval_status", ["approved", "confirmed"]);

      const todayShift = assignments?.find(
        (a: any) => a.shifts?.shift_date === today
      );

      if (todayShift) {
        const shift = (todayShift as any).shifts;
        return {
          isOnDuty: true,
          locationId: shift?.location_id || employee.location_id,
          shiftLocationName: shift?.locations?.name,
          reason: "has_approved_shift_today" as const,
        };
      }

      // Check if they have any shift today (but not approved)
      const { data: pendingAssignments } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          approval_status,
          shifts:shift_id (shift_date)
        `)
        .eq("staff_id", employee.id)
        .eq("approval_status", "pending");

      const hasPendingToday = pendingAssignments?.some(
        (a: any) => a.shifts?.shift_date === today
      );

      if (hasPendingToday) {
        return {
          isOnDuty: false,
          locationId: employee.location_id,
          reason: "not_approved" as const,
        };
      }

      // No shift today
      return {
        isOnDuty: false,
        locationId: employee.location_id,
        reason: "no_shift" as const,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !data) {
    return {
      isOnDuty: false,
      locationId: null,
      reason: "loading",
    };
  }

  return data;
}
