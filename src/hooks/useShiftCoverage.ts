/**
 * Hook for fetching shift coverage data for task filtering
 * Uses canonical day window to ensure consistent date handling
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { Shift, CoverageResult, checkTaskCoverage, applyShiftCoverage, groupTasksByCoverage } from "@/lib/taskCoverageEngine";
import { Task } from "./useTasks";
import { getCompanyDayWindow, toDayKey } from "@/lib/companyDayUtils";

export interface UseShiftCoverageOptions {
  /** Start date for shift coverage check */
  startDate?: Date;
  /** End date for shift coverage check */
  endDate?: Date;
  /** Location ID filter */
  locationId?: string;
  /** Enable the query */
  enabled?: boolean;
}

/**
 * Fetch shifts for a date range to enable coverage checking
 */
export const useShiftCoverage = (options: UseShiftCoverageOptions = {}) => {
  const { company } = useCompanyContext();
  
  // Use canonical day window for consistent "today" definition
  const todayWindow = getCompanyDayWindow();
  const {
    startDate = todayWindow.dayStart,
    endDate = endOfDay(addDays(todayWindow.now, 7)),
    locationId,
    enabled = true,
  } = options;

  // Use canonical day keys to avoid UTC/local mismatch
  const startStr = toDayKey(startDate);
  const endStr = toDayKey(endDate);

  return useQuery({
    queryKey: ["shift-coverage", company?.id, startStr, endStr, locationId],
    queryFn: async (): Promise<Shift[]> => {
      if (!company?.id) return [];

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
          shift_assignments!left(id, staff_id, approval_status)
        `)
        .eq("company_id", company.id)
        .gte("shift_date", startStr)
        .lte("shift_date", endStr);

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Note: shifts.role is a text field (not role_id) - this is the only role field available
      // The coverage engine uses normalized name matching for role comparison
      return (data || []).map((shift: any) => ({
        id: shift.id,
        location_id: shift.location_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        role: shift.role,
        is_published: shift.is_published,
        shift_assignments: shift.shift_assignments || [],
      })) as Shift[];
    },
    enabled: enabled && !!company?.id,
  });
};

/**
 * Hook that applies coverage filtering to tasks
 */
export const useTasksWithCoverage = (
  tasks: Task[],
  targetDate: Date,
  options: {
    filterNoCoverage?: boolean;
    shifts?: Shift[];
  } = {}
) => {
  const { filterNoCoverage = true, shifts: providedShifts } = options;

  // Fetch shifts if not provided
  const { data: fetchedShifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    enabled: !providedShifts,
  });

  const shifts = providedShifts || fetchedShifts;

  const coveredTasks = applyShiftCoverage(tasks, shifts, targetDate, {
    filterNoCoverage,
  });

  const { covered, noCoverage } = groupTasksByCoverage(tasks, shifts, targetDate);

  return {
    tasks: coveredTasks,
    covered,
    noCoverage,
    shifts,
    isLoading: shiftsLoading,
  };
};

/**
 * Check coverage for a single task
 */
export const useSingleTaskCoverage = (task: Task | null, targetDate: Date) => {
  const { data: shifts = [], isLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    enabled: !!task,
  });

  if (!task) {
    return { coverage: null, isLoading: false };
  }

  const coverage = checkTaskCoverage(task, shifts, targetDate);

  return { coverage, isLoading };
};
