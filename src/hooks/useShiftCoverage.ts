/**
 * Hook for fetching shift coverage data for task filtering
 * Uses canonical day window to ensure consistent date handling
 * 
 * IMPORTANT: This hook is CONTEXT-INDEPENDENT. It does NOT call useCompanyContext().
 * All callers MUST provide companyId explicitly. This ensures the hook works for:
 * - Staff users (who are NOT in company_users table)
 * - Manager views (who get companyId from CompanyContext at their call site)
 * - Any route that may lack CompanyProvider
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  /** 
   * Company ID for shift lookup (REQUIRED for shifts to be fetched).
   * Staff views: pass from employee.company_id
   * Manager views: pass from useCompanyContext().company.id at call site
   */
  companyId?: string;
}

/**
 * Fetch shifts for a date range to enable coverage checking.
 * 
 * CONTEXT-INDEPENDENT: Does NOT call useCompanyContext().
 * Caller MUST provide companyId explicitly for shifts to be fetched.
 */
export const useShiftCoverage = (options: UseShiftCoverageOptions = {}) => {
  // Use canonical day window for consistent "today" definition
  const todayWindow = getCompanyDayWindow();
  const {
    startDate = todayWindow.dayStart,
    endDate = endOfDay(addDays(todayWindow.now, 7)),
    locationId,
    enabled = true,
    companyId,
  } = options;

  // Use canonical day keys to avoid UTC/local mismatch
  const startStr = toDayKey(startDate);
  const endStr = toDayKey(endDate);

  return useQuery({
    queryKey: ["shift-coverage", companyId, startStr, endStr, locationId],
    queryFn: async (): Promise<Shift[]> => {
      if (!companyId) {
        if (import.meta.env.DEV) {
          console.log("[useShiftCoverage] No companyId provided - returning empty shifts");
        }
        return [];
      }

      let query = supabase
        .from("shifts")
        .select(`
          id,
          location_id,
          shift_date,
          start_time,
          end_time,
          role,
          status,
          is_published,
          shift_assignments!left(id, staff_id, approval_status)
        `)
        .eq("company_id", companyId)
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
        status: shift.status,
        is_published: shift.is_published,
        shift_assignments: shift.shift_assignments || [],
      })) as Shift[];
    },
    enabled: enabled && !!companyId,
  });
};

/**
 * Hook that applies coverage filtering to tasks
 * 
 * CONTEXT-INDEPENDENT: Requires companyId to be passed explicitly
 */
export const useTasksWithCoverage = (
  tasks: Task[],
  targetDate: Date,
  options: {
    filterNoCoverage?: boolean;
    shifts?: Shift[];
    companyId?: string;
  } = {}
) => {
  const { filterNoCoverage = true, shifts: providedShifts, companyId } = options;

  // Fetch shifts if not provided (requires companyId)
  const { data: fetchedShifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    enabled: !providedShifts && !!companyId,
    companyId,
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
 * 
 * CONTEXT-INDEPENDENT: Requires companyId to be passed explicitly
 */
export const useSingleTaskCoverage = (
  task: Task | null, 
  targetDate: Date,
  companyId?: string
) => {
  const { data: shifts = [], isLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    enabled: !!task && !!companyId,
    companyId,
  });

  if (!task) {
    return { coverage: null, isLoading: false };
  }

  const coverage = checkTaskCoverage(task, shifts, targetDate);

  return { coverage, isLoading };
};
