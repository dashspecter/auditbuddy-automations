/**
 * Hook for mobile task views that applies the unified occurrence engine
 * to the user's tasks (from useMyTasks).
 * 
 * This ensures mobile parity with desktop Today/Tomorrow tabs.
 */

import { useMemo } from "react";
import { useMyTasks, Task } from "./useTasks";
import {
  getOccurrencesForDate,
  getCanonicalToday,
  getCanonicalTomorrow,
  groupOccurrencesByStatus,
  isTaskOverdue,
} from "@/lib/taskOccurrenceEngine";

export interface MyTaskOccurrences {
  /** All tasks for today (pending, overdue, completed) */
  todayTasks: Task[];
  /** Tomorrow's pending tasks */
  tomorrowTasks: Task[];
  /** Grouped by status for display */
  todayGrouped: {
    pending: Task[];
    overdue: Task[];
    completed: Task[];
  };
  /** Active tasks (pending, started, not overdue) */
  activeTasks: Task[];
  /** Upcoming tasks (scheduled for later today, not started yet) */
  upcomingTasks: Task[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Raw tasks from useMyTasks */
  rawTasks: Task[];
}

/**
 * Get the current user's tasks with occurrence expansion applied.
 * This mirrors the desktop Today/Tomorrow logic for mobile parity.
 */
export function useMyTaskOccurrences(): MyTaskOccurrences {
  const { data: rawTasks = [], isLoading, error } = useMyTasks();

  const result = useMemo(() => {
    const today = getCanonicalToday();
    const tomorrow = getCanonicalTomorrow();
    const now = new Date();

    // Apply occurrence engine for Today and Tomorrow
    const todayTasks = getOccurrencesForDate(rawTasks, today, {
      includeCompleted: true,
      includeVirtual: true,
    });

    const tomorrowTasks = getOccurrencesForDate(rawTasks, tomorrow, {
      includeCompleted: false,
      includeVirtual: true,
    });

    // Group today's tasks
    const todayGrouped = groupOccurrencesByStatus(todayTasks);

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
      todayTasks,
      tomorrowTasks,
      todayGrouped,
      activeTasks,
      upcomingTasks,
    };
  }, [rawTasks]);

  return {
    ...result,
    isLoading,
    error: error as Error | null,
    rawTasks,
  };
}
