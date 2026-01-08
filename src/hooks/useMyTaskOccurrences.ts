/**
 * Hook for mobile task views that applies the unified occurrence engine
 * to the user's tasks (from useMyTasks).
 * 
 * This ensures mobile parity with desktop Today/Tomorrow tabs.
 * Uses the unified pipeline for shift-aware task visibility.
 */

import { useMemo } from "react";
import { useMyTasks, Task } from "./useTasks";
import { useShiftCoverage } from "./useShiftCoverage";
import {
  runPipelineForDate,
  groupTasksByStatusShiftAware,
  TaskWithCoverage,
} from "@/lib/unifiedTaskPipeline";
import {
  getCanonicalToday,
  getCanonicalTomorrow,
} from "@/lib/taskOccurrenceEngine";
import { startOfDay, endOfDay, addDays } from "date-fns";

export interface MyTaskOccurrences {
  /** All tasks for today (pending, overdue, completed) */
  todayTasks: TaskWithCoverage[];
  /** Tomorrow's pending tasks */
  tomorrowTasks: TaskWithCoverage[];
  /** Grouped by status for display */
  todayGrouped: {
    pending: TaskWithCoverage[];
    overdue: TaskWithCoverage[];
    completed: TaskWithCoverage[];
    noCoverage: TaskWithCoverage[];
  };
  /** Active tasks (pending, started, not overdue) */
  activeTasks: TaskWithCoverage[];
  /** Upcoming tasks (scheduled for later today, not started yet) */
  upcomingTasks: TaskWithCoverage[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Raw tasks from useMyTasks */
  rawTasks: Task[];
  /** Debug stats */
  debug?: {
    today: { generated: number; covered: number; visible: number };
    tomorrow: { generated: number; covered: number; visible: number };
  };
}

/**
 * Get the current user's tasks with occurrence expansion applied.
 * This mirrors the desktop Today/Tomorrow logic for mobile parity.
 * Uses unified pipeline for shift-aware filtering.
 */
export function useMyTaskOccurrences(): MyTaskOccurrences {
  const { data: rawTasks = [], isLoading, error } = useMyTasks();

  // Fetch shifts for today + tomorrow
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(addDays(new Date(), 1)),
  });

  const result = useMemo(() => {
    const today = getCanonicalToday();
    const tomorrow = getCanonicalTomorrow();
    const now = new Date();

    // Apply unified pipeline for Today (execution mode = only covered tasks)
    const todayResult = runPipelineForDate(rawTasks, today, {
      viewMode: "execution",
      includeCompleted: true,
      includeVirtual: true,
      shifts,
    });

    const tomorrowResult = runPipelineForDate(rawTasks, tomorrow, {
      viewMode: "execution",
      includeCompleted: false,
      includeVirtual: true,
      shifts,
    });

    // Group today's tasks using shift-aware grouping
    const todayGrouped = groupTasksByStatusShiftAware(todayResult.tasks);

    // Active = pending tasks that have started (start_at <= now)
    const activeTasks = todayGrouped.pending.filter((task) => {
      if (!task.start_at) return true; // No start time = always active
      return new Date(task.start_at) <= now;
    });

    // Also include overdue in active since they need attention
    activeTasks.push(...todayGrouped.overdue);

    // Upcoming = pending tasks that haven't started yet
    const upcomingTasks = todayGrouped.pending.filter((task) => {
      if (!task.start_at) return false;
      return new Date(task.start_at) > now;
    });

    return {
      todayTasks: todayResult.tasks,
      tomorrowTasks: tomorrowResult.tasks,
      todayGrouped,
      activeTasks,
      upcomingTasks,
      debug: {
        today: {
          generated: todayResult.debug.generated,
          covered: todayResult.debug.covered,
          visible: todayResult.debug.visible,
        },
        tomorrow: {
          generated: tomorrowResult.debug.generated,
          covered: tomorrowResult.debug.covered,
          visible: tomorrowResult.debug.visible,
        },
      },
    };
  }, [rawTasks, shifts]);

  return {
    ...result,
    isLoading: isLoading || shiftsLoading,
    error: error as Error | null,
    rawTasks,
  };
}
