/**
 * UNIFIED TASKS HOOK
 * 
 * Provides shift-aware task data through the unified pipeline.
 * All views (Calendar, Today, Tomorrow, Ops Dashboard, By Employee, Mobile)
 * should use this hook to ensure consistent task visibility.
 */

import { useMemo } from "react";
import { useTasks, Task } from "./useTasks";
import { useShiftCoverage } from "./useShiftCoverage";
import {
  runPipelineForDate,
  runPipelineForDateRange,
  getTodayTasks,
  getTomorrowTasks,
  groupTasksByStatusShiftAware,
  PipelineResult,
  PipelineOptions,
  ViewMode,
  TaskWithCoverage,
} from "@/lib/unifiedTaskPipeline";
import { Shift } from "@/lib/taskCoverageEngine";
import { startOfDay, endOfDay, addDays } from "date-fns";

export interface UseUnifiedTasksOptions {
  /** View mode: execution (covered only) or planning (all + no-coverage flagged) */
  viewMode?: ViewMode;
  /** Start date for the range */
  startDate?: Date;
  /** End date for the range */
  endDate?: Date;
  /** Filter by location */
  locationId?: string;
  /** Filter by employee */
  employeeId?: string;
  /** Filter by role */
  roleId?: string;
  /** Include completed tasks */
  includeCompleted?: boolean;
  /** Provide shifts externally (skip fetching) */
  shifts?: Shift[];
}

export interface UnifiedTasksResult {
  /** All visible tasks after pipeline */
  tasks: TaskWithCoverage[];
  /** Today's tasks (execution mode) */
  todayTasks: PipelineResult;
  /** Tomorrow's tasks (execution mode) */
  tomorrowTasks: PipelineResult;
  /** Grouped tasks for the date range */
  grouped: {
    pending: TaskWithCoverage[];
    overdue: TaskWithCoverage[];
    completed: TaskWithCoverage[];
    noCoverage: TaskWithCoverage[];
  };
  /** Debug stats */
  debug: {
    today: PipelineResult["debug"];
    tomorrow: PipelineResult["debug"];
    range: PipelineResult["debug"];
  };
  /** Shifts used for coverage */
  shifts: Shift[];
  /** Loading states */
  isLoading: boolean;
  isLoadingShifts: boolean;
  /** Raw tasks (unfiltered) */
  rawTasks: Task[];
}

/**
 * Hook that provides unified, shift-aware task data
 */
export function useUnifiedTasks(options: UseUnifiedTasksOptions = {}): UnifiedTasksResult {
  const {
    viewMode = "execution",
    startDate = startOfDay(new Date()),
    endDate = endOfDay(addDays(new Date(), 7)),
    locationId,
    employeeId,
    roleId,
    includeCompleted = true,
    shifts: providedShifts,
  } = options;

  // Fetch tasks
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useTasks();

  // Fetch shifts for the date range
  const { data: fetchedShifts = [], isLoading: isLoadingShifts } = useShiftCoverage({
    startDate,
    endDate,
    locationId,
    enabled: !providedShifts,
  });

  const shifts = providedShifts || fetchedShifts;

  // Run unified pipeline for date range
  const rangeResult = useMemo(() => {
    return runPipelineForDateRange(rawTasks, startDate, endDate, {
      viewMode,
      includeCompleted,
      includeVirtual: true,
      shifts,
      employeeId,
      roleId,
      locationId,
    });
  }, [rawTasks, startDate, endDate, viewMode, includeCompleted, shifts, employeeId, roleId, locationId]);

  // Today's tasks (always execution mode for action)
  const todayResult = useMemo(() => {
    return getTodayTasks(rawTasks, shifts, {
      viewMode,
      includeCompleted: true,
      employeeId,
      roleId,
      locationId,
    });
  }, [rawTasks, shifts, viewMode, employeeId, roleId, locationId]);

  // Tomorrow's tasks
  const tomorrowResult = useMemo(() => {
    return getTomorrowTasks(rawTasks, shifts, {
      viewMode,
      includeCompleted: false,
      employeeId,
      roleId,
      locationId,
    });
  }, [rawTasks, shifts, viewMode, employeeId, roleId, locationId]);

  // Group all visible tasks by status
  const grouped = useMemo(() => {
    return groupTasksByStatusShiftAware(rangeResult.tasks);
  }, [rangeResult.tasks]);

  return {
    tasks: rangeResult.tasks,
    todayTasks: todayResult,
    tomorrowTasks: tomorrowResult,
    grouped,
    debug: {
      today: todayResult.debug,
      tomorrow: tomorrowResult.debug,
      range: rangeResult.debug,
    },
    shifts,
    isLoading: isLoadingTasks,
    isLoadingShifts,
    rawTasks,
  };
}

/**
 * Hook for a single date's tasks (unified pipeline)
 */
export function useUnifiedTasksForDate(
  targetDate: Date,
  options: Omit<UseUnifiedTasksOptions, "startDate" | "endDate"> = {}
) {
  const {
    viewMode = "execution",
    locationId,
    employeeId,
    roleId,
    includeCompleted = true,
    shifts: providedShifts,
  } = options;

  const { data: rawTasks = [], isLoading: isLoadingTasks } = useTasks();

  const { data: fetchedShifts = [], isLoading: isLoadingShifts } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    locationId,
    enabled: !providedShifts,
  });

  const shifts = providedShifts || fetchedShifts;

  const result = useMemo(() => {
    return runPipelineForDate(rawTasks, targetDate, {
      viewMode,
      includeCompleted,
      includeVirtual: true,
      shifts,
      employeeId,
      roleId,
      locationId,
    });
  }, [rawTasks, targetDate, viewMode, includeCompleted, shifts, employeeId, roleId, locationId]);

  const grouped = useMemo(() => {
    return groupTasksByStatusShiftAware(result.tasks);
  }, [result.tasks]);

  return {
    ...result,
    grouped,
    shifts,
    isLoading: isLoadingTasks,
    isLoadingShifts,
    rawTasks,
  };
}
