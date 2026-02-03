/**
 * UNIFIED TASKS HOOK
 * 
 * Provides shift-aware task data through the unified pipeline.
 * All views (Calendar, Today, Tomorrow, Ops Dashboard, By Employee, Mobile)
 * should use this hook to ensure consistent task visibility.
 * 
 * CRITICAL: This hook automatically uses the company context to fetch shifts.
 * If no companyId is provided in options, it will use the current company from context.
 * 
 * NOTE: This hook now fetches per-occurrence completions from task_completions table
 * to ensure web admin shows the same completion state as kiosk and mobile.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTasks, Task } from "./useTasks";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useShiftCoverage } from "./useShiftCoverage";
import { supabase } from "@/integrations/supabase/client";
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
import { toDayKey } from "@/lib/companyDayUtils";
import { getOriginalTaskId } from "@/lib/taskOccurrenceEngine";
import { startOfDay, endOfDay, addDays, format } from "date-fns";

// Completion record type
interface CompletionRecord {
  task_id: string;
  occurrence_date: string;
  completed_by_employee_id: string | null;
  completed_at: string;
  completion_mode: string;
}

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
  /** Company ID for shift lookup (REQUIRED for shifts to be fetched) */
  companyId?: string;
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
  // Get companyId from context if not provided
  const { company } = useCompanyContext();
  
  const {
    viewMode = "execution",
    startDate = startOfDay(new Date()),
    endDate = endOfDay(addDays(new Date(), 7)),
    locationId,
    employeeId,
    roleId,
    includeCompleted = true,
    shifts: providedShifts,
    companyId: providedCompanyId,
  } = options;

  // Use provided companyId or fall back to company context
  const companyId = providedCompanyId || company?.id;

  // Fetch tasks
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useTasks();

  // Fetch shifts for the date range (requires companyId)
  // CRITICAL: This was the bug - companyId was never passed, causing empty shifts
  const { data: fetchedShifts = [], isLoading: isLoadingShifts } = useShiftCoverage({
    startDate,
    endDate,
    locationId,
    enabled: !providedShifts && !!companyId,
    companyId,
  });

  const shifts = providedShifts || fetchedShifts;

  // Compute day keys for the date range (for per-occurrence completion lookup)
  const todayDayKey = toDayKey(new Date());
  const tomorrowDayKey = toDayKey(addDays(new Date(), 1));

  // Fetch per-occurrence completions from task_completions table
  // This ensures web admin shows the same completion state as kiosk and mobile
  const { data: completions = [] } = useQuery({
    queryKey: ["unified-task-completions", companyId, todayDayKey, rawTasks.length],
    queryFn: async (): Promise<CompletionRecord[]> => {
      const taskIds = rawTasks.map(t => t.id);
      if (taskIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("task_completions" as any)
        .select("task_id, occurrence_date, completed_by_employee_id, completed_at, completion_mode")
        .in("task_id", taskIds)
        .in("occurrence_date", [todayDayKey, tomorrowDayKey]);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.log("[useUnifiedTasks] Completions error:", error);
        }
        return [];
      }
      
      return (data || []).map((c: any) => ({
        task_id: c.task_id,
        occurrence_date: c.occurrence_date,
        completed_by_employee_id: c.completed_by_employee_id,
        completed_at: c.completed_at,
        completion_mode: c.completion_mode,
      }));
    },
    enabled: rawTasks.length > 0,
    staleTime: 0,
    refetchInterval: 10000, // Poll every 10s for web admin
  });

  // Build completions lookup map
  const completionsByKey = useMemo(() => {
    const map = new Map<string, CompletionRecord>();
    for (const c of completions) {
      const key = `${c.task_id}:${c.occurrence_date}`;
      map.set(key, c);
    }
    return map;
  }, [completions]);

  // DEV: Log shift coverage debug info
  if (import.meta.env.DEV) {
    console.log("[useUnifiedTasks] Shift coverage debug:", {
      companyId: companyId?.slice(0, 8),
      shiftsCount: shifts.length,
      rawTasksCount: rawTasks.length,
      completionsCount: completions.length,
      dateRange: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
    });
  }

  // Helper to apply per-occurrence completion to tasks
  const applyCompletions = (tasks: TaskWithCoverage[], targetDayKey: string): TaskWithCoverage[] => {
    return tasks.map((task) => {
      // Extract base task ID
      const baseTaskId = getOriginalTaskId(task.id);
      
      // Get occurrence date from virtual ID or use target day
      let occurrenceDate = targetDayKey;
      if (task.id.includes("-virtual-")) {
        const match = task.id.match(/virtual-(\d{4}-\d{2}-\d{2})/);
        if (match) occurrenceDate = match[1];
      } else if (task.id.includes("-completed-")) {
        const match = task.id.match(/-completed-(\d{4}-\d{2}-\d{2})/);
        if (match) occurrenceDate = match[1];
      }
      
      const completionKey = `${baseTaskId}:${occurrenceDate}`;
      const completion = completionsByKey.get(completionKey);
      
      // CRITICAL FIX: For recurring tasks, the template's "completed" status may be STALE
      // (from a previous day's completion). We MUST apply per-occurrence completion data
      // from task_completions table ALWAYS if it exists for this occurrence_date.
      if (completion) {
        return {
          ...task,
          status: "completed" as any,
          completed_at: completion.completed_at,
          completed_by_employee_id: completion.completed_by_employee_id,
          // Mark that this is an occurrence-level completion for tracking
          isOccurrenceCompleted: true,
        };
      }
      
      return task;
    });
  };

  // Run unified pipeline for date range
  const rangeResult = useMemo(() => {
    const result = runPipelineForDateRange(rawTasks, startDate, endDate, {
      viewMode,
      includeCompleted,
      includeVirtual: true,
      shifts,
      employeeId,
      roleId,
      locationId,
    });
    
    // Apply per-occurrence completions
    return {
      ...result,
      tasks: applyCompletions(result.tasks, todayDayKey),
    };
  }, [rawTasks, startDate, endDate, viewMode, includeCompleted, shifts, employeeId, roleId, locationId, completionsByKey, todayDayKey]);

  // Today's tasks (always execution mode for action)
  const todayResult = useMemo(() => {
    const result = getTodayTasks(rawTasks, shifts, {
      viewMode,
      includeCompleted: true,
      employeeId,
      roleId,
      locationId,
    });
    
    // Apply per-occurrence completions
    return {
      ...result,
      tasks: applyCompletions(result.tasks, todayDayKey),
    };
  }, [rawTasks, shifts, viewMode, employeeId, roleId, locationId, completionsByKey, todayDayKey]);

  // Tomorrow's tasks
  const tomorrowResult = useMemo(() => {
    const result = getTomorrowTasks(rawTasks, shifts, {
      viewMode,
      includeCompleted: false,
      employeeId,
      roleId,
      locationId,
    });
    
    // Apply per-occurrence completions for tomorrow
    return {
      ...result,
      tasks: applyCompletions(result.tasks, tomorrowDayKey),
    };
  }, [rawTasks, shifts, viewMode, employeeId, roleId, locationId, completionsByKey, tomorrowDayKey]);

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
  // Get companyId from context if not provided
  const { company } = useCompanyContext();
  
  const {
    viewMode = "execution",
    locationId,
    employeeId,
    roleId,
    includeCompleted = true,
    shifts: providedShifts,
    companyId: providedCompanyId,
  } = options;

  // Use provided companyId or fall back to company context
  const companyId = providedCompanyId || company?.id;

  const { data: rawTasks = [], isLoading: isLoadingTasks } = useTasks();

  const { data: fetchedShifts = [], isLoading: isLoadingShifts } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    locationId,
    enabled: !providedShifts && !!companyId,
    companyId,
  });

  const shifts = providedShifts || fetchedShifts;
  const targetDayKey = toDayKey(targetDate);

  // Fetch per-occurrence completions for this date
  const { data: completions = [] } = useQuery({
    queryKey: ["unified-task-completions-date", companyId, targetDayKey, rawTasks.length],
    queryFn: async (): Promise<CompletionRecord[]> => {
      const taskIds = rawTasks.map(t => t.id);
      if (taskIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("task_completions" as any)
        .select("task_id, occurrence_date, completed_by_employee_id, completed_at, completion_mode")
        .in("task_id", taskIds)
        .eq("occurrence_date", targetDayKey);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.log("[useUnifiedTasksForDate] Completions error:", error);
        }
        return [];
      }
      
      return (data || []).map((c: any) => ({
        task_id: c.task_id,
        occurrence_date: c.occurrence_date,
        completed_by_employee_id: c.completed_by_employee_id,
        completed_at: c.completed_at,
        completion_mode: c.completion_mode,
      }));
    },
    enabled: rawTasks.length > 0,
    staleTime: 0,
  });

  // Build completions lookup map
  const completionsByKey = useMemo(() => {
    const map = new Map<string, CompletionRecord>();
    for (const c of completions) {
      const key = `${c.task_id}:${c.occurrence_date}`;
      map.set(key, c);
    }
    return map;
  }, [completions]);

  const result = useMemo(() => {
    const pipelineResult = runPipelineForDate(rawTasks, targetDate, {
      viewMode,
      includeCompleted,
      includeVirtual: true,
      shifts,
      employeeId,
      roleId,
      locationId,
    });

    // Apply per-occurrence completions
    const tasksWithCompletions = pipelineResult.tasks.map((task) => {
      const baseTaskId = getOriginalTaskId(task.id);
      
      let occurrenceDate = targetDayKey;
      if (task.id.includes("-virtual-")) {
        const match = task.id.match(/virtual-(\d{4}-\d{2}-\d{2})/);
        if (match) occurrenceDate = match[1];
      }
      
      const completionKey = `${baseTaskId}:${occurrenceDate}`;
      const completion = completionsByKey.get(completionKey);
      
      if (completion && task.status !== "completed") {
        return {
          ...task,
          status: "completed" as any,
          completed_at: completion.completed_at,
          completed_by_employee_id: completion.completed_by_employee_id,
        };
      }
      
      return task;
    });

    return {
      ...pipelineResult,
      tasks: tasksWithCompletions,
    };
  }, [rawTasks, targetDate, viewMode, includeCompleted, shifts, employeeId, roleId, locationId, completionsByKey, targetDayKey]);

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
