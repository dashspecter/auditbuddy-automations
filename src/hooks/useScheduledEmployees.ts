/**
 * Hook to fetch employees who are scheduled to work on a given date
 * This is the source of truth for the "By Employee" view
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { format } from "date-fns";

export interface ScheduledEmployee {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  location_id: string | null;
  /** Shift info for this scheduled day */
  shiftId: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftRole: string | null;
  shiftLocationId: string | null;
}

export interface UseScheduledEmployeesOptions {
  /** Target date for scheduled employees */
  targetDate: Date;
  /** Location ID filter */
  locationId?: string;
  /** Enable the query */
  enabled?: boolean;
}

/**
 * Fetch employees who are scheduled (have shift assignments) for a given date
 */
export const useScheduledEmployees = (options: UseScheduledEmployeesOptions) => {
  const { company } = useCompanyContext();
  const { targetDate, locationId, enabled = true } = options;

  const dateStr = format(targetDate, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["scheduled-employees", company?.id, dateStr, locationId],
    queryFn: async (): Promise<ScheduledEmployee[]> => {
      if (!company?.id) return [];

      // Build query for shifts on this date with their assignments
      let query = supabase
        .from("shifts")
        .select(`
          id,
          location_id,
          shift_date,
          start_time,
          end_time,
          role,
          is_published,
          shift_assignments!inner(
            id,
            staff_id,
            approval_status
          )
        `)
        .eq("company_id", company.id)
        .eq("shift_date", dateStr);

      if (locationId && locationId !== "all") {
        query = query.eq("location_id", locationId);
      }

      const { data: shiftsData, error: shiftsError } = await query;
      if (shiftsError) throw shiftsError;

      if (!shiftsData || shiftsData.length === 0) return [];

      // Extract unique employee IDs from shift assignments
      const employeeShiftMap = new Map<string, {
        shiftId: string;
        shiftDate: string;
        shiftStartTime: string;
        shiftEndTime: string;
        shiftRole: string | null;
        shiftLocationId: string | null;
      }>();

      for (const shift of shiftsData) {
        const assignments = shift.shift_assignments || [];
        for (const assignment of assignments) {
          if (assignment.staff_id && !employeeShiftMap.has(assignment.staff_id)) {
            employeeShiftMap.set(assignment.staff_id, {
              shiftId: shift.id,
              shiftDate: shift.shift_date,
              shiftStartTime: shift.start_time,
              shiftEndTime: shift.end_time,
              shiftRole: shift.role,
              shiftLocationId: shift.location_id,
            });
          }
        }
      }

      if (employeeShiftMap.size === 0) return [];

      // Fetch employee details for all scheduled employees
      const employeeIds = Array.from(employeeShiftMap.keys());
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          id,
          full_name,
          email,
          phone,
          role,
          status,
          avatar_url,
          location_id
        `)
        .in("id", employeeIds);

      if (employeesError) throw employeesError;

      // Merge employee data with shift info
      const scheduledEmployees: ScheduledEmployee[] = (employeesData || []).map((emp) => {
        const shiftInfo = employeeShiftMap.get(emp.id)!;
        return {
          id: emp.id,
          full_name: emp.full_name,
          email: emp.email,
          phone: emp.phone,
          role: emp.role,
          status: emp.status,
          avatar_url: emp.avatar_url,
          location_id: emp.location_id,
          shiftId: shiftInfo.shiftId,
          shiftDate: shiftInfo.shiftDate,
          shiftStartTime: shiftInfo.shiftStartTime,
          shiftEndTime: shiftInfo.shiftEndTime,
          shiftRole: shiftInfo.shiftRole,
          shiftLocationId: shiftInfo.shiftLocationId,
        };
      });

      // Sort by shift start time
      scheduledEmployees.sort((a, b) => {
        if (a.shiftStartTime < b.shiftStartTime) return -1;
        if (a.shiftStartTime > b.shiftStartTime) return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      return scheduledEmployees;
    },
    enabled: enabled && !!company?.id,
  });
};
