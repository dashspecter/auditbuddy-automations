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
  /** 
   * Override company ID (for staff users who may not have CompanyContext).
   * If provided, this takes precedence over company from context.
   */
  companyId?: string;
}

/**
 * Fetch shifts for a date range to enable coverage checking.
 * 
 * IMPORTANT: For staff users (who don't have CompanyContext), you MUST pass
 * companyId explicitly via options. The hook will try to use CompanyContext
 * as a fallback for manager views.
 */
export const useShiftCoverage = (options: UseShiftCoverageOptions = {}) => {
  // Try to get company from context (works for managers)
  // This will be undefined for staff users who don't have CompanyContext
  const companyContext = useCompanyContext();
  const contextCompanyId = companyContext?.company?.id;
  
  // Use canonical day window for consistent "today" definition
  const todayWindow = getCompanyDayWindow();
  const {
    startDate = todayWindow.dayStart,
    endDate = endOfDay(addDays(todayWindow.now, 7)),
    locationId,
    enabled = true,
    companyId: providedCompanyId,
  } = options;

  // Prefer provided companyId, fallback to context company
  const effectiveCompanyId = providedCompanyId || contextCompanyId;

  // Use canonical day keys to avoid UTC/local mismatch
  const startStr = toDayKey(startDate);
  const endStr = toDayKey(endDate);

  return useQuery({
    queryKey: ["shift-coverage", effectiveCompanyId, startStr, endStr, locationId],
    queryFn: async (): Promise<Shift[]> => {
      if (!effectiveCompanyId) {
        if (import.meta.env.DEV) {
          console.log("[useShiftCoverage] No company ID available (context or options)");
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
          is_published,
          shift_assignments!left(id, staff_id, approval_status)
        `)
        .eq("company_id", effectiveCompanyId)
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
    enabled: enabled && !!effectiveCompanyId,
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
