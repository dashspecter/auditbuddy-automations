/**
 * UNIFIED TASK VISIBILITY PIPELINE
 * 
 * This is the SINGLE source of truth for all task views (Calendar, Today, Tomorrow,
 * Ops Dashboard, By Employee, Mobile).
 * 
 * Pipeline stages (all debuggable):
 * 1. Generate occurrences for date range (recurrence engine)
 * 2. Deduplicate occurrences (unique key)
 * 3. Attach scope: location(s), role(s), employee(s), shared/individual
 * 4. Resolve shift coverage (who is actually working)
 * 5. Permission filter (admin vs employee)
 * 6. Compute status/overdue/late (ONLY for covered tasks)
 * 7. Group + render
 */

import { Task } from "@/hooks/useTasks";
import {
  getOccurrencesForDate,
  getOccurrencesForDateRange,
  isTaskOverdue as baseIsTaskOverdue,
  getTaskDate,
  getTaskDeadline,
  isVirtualId,
  getCanonicalToday,
  getCanonicalTomorrow,
  getCanonicalNow,
} from "@/lib/taskOccurrenceEngine";
import {
  Shift,
  CoverageResult,
  checkTaskCoverage,
  applyShiftCoverage,
  groupTasksByCoverage,
  isTaskOverdueWithCoverage,
  TaskWithCoverage,
} from "@/lib/taskCoverageEngine";
import { format, startOfDay, endOfDay, addDays, isSameDay } from "date-fns";

// =============================================================
// TYPES
// =============================================================

export type ViewMode = "execution" | "planning";

export interface PipelineOptions {
  /** View mode: execution (covered only) or planning (all + no-coverage flagged) */
  viewMode: ViewMode;
  /** Include completed tasks */
  includeCompleted?: boolean;
  /** Include virtual (future recurring) instances */
  includeVirtual?: boolean;
  /** Filter by specific employee ID */
  employeeId?: string;
  /** Filter by specific role ID */
  roleId?: string;
  /** Filter by specific location ID */
  locationId?: string;
  /** Available shifts for coverage calculation */
  shifts?: Shift[];
  /** Grace window in minutes for shift matching */
  graceWindowMinutes?: number;
}

export interface PipelineResult {
  /** Final visible tasks after all filters */
  tasks: TaskWithCoverage[];
  /** Tasks grouped by coverage status (for manager views) */
  covered: TaskWithCoverage[];
  noCoverage: TaskWithCoverage[];
  /** Debug stats for each pipeline stage */
  debug: PipelineDebugStats;
}

export interface PipelineDebugStats {
  /** Tasks after occurrence generation */
  generated: number;
  /** Tasks after deduplication */
  deduped: number;
  /** Tasks with coverage */
  covered: number;
  /** Tasks without coverage */
  noCoverage: number;
  /** Final visible count */
  visible: number;
  /** Overdue count (only covered tasks) */
  overdue: number;
  /** Completed count */
  completed: number;
  /** Pending count */
  pending: number;
}

// =============================================================
// UNIFIED PIPELINE IMPLEMENTATION
// =============================================================

/**
 * Run the unified task visibility pipeline for a specific date
 */
export function runPipelineForDate(
  tasks: Task[],
  targetDate: Date,
  options: PipelineOptions
): PipelineResult {
  const {
    viewMode,
    includeCompleted = true,
    includeVirtual = true,
    shifts = [],
    graceWindowMinutes = 30,
  } = options;

  // STAGE 1: Generate occurrences for the target date
  const generatedOccurrences = getOccurrencesForDate(tasks, targetDate, {
    includeCompleted,
    includeVirtual,
    employeeId: options.employeeId,
    roleId: options.roleId,
    locationId: options.locationId,
  });

  // STAGE 2: Deduplicate (already handled by getOccurrencesForDate)
  const dedupedOccurrences = generatedOccurrences;

  // STAGE 3+4: Resolve shift coverage
  // dayBasedCoverage=true ensures tasks remain visible all day once a shift existed
  const tasksWithCoverage: TaskWithCoverage[] = dedupedOccurrences.map((task) => {
    const coverage = checkTaskCoverage(task, shifts, targetDate, { 
      graceWindowMinutes,
      dayBasedCoverage: true, // Tasks stay visible after shift ends until end-of-day
    });
    return { ...task, coverage };
  });

  // Separate by coverage
  const covered = tasksWithCoverage.filter((t) => t.coverage?.hasCoverage);
  const noCoverage = tasksWithCoverage.filter((t) => !t.coverage?.hasCoverage);

  // STAGE 5: Apply view mode filter
  let visible: TaskWithCoverage[];
  if (viewMode === "execution") {
    // Execution mode:
    // - show covered tasks (normal in-shift execution)
    // - ALSO show overdue tasks for the day even if they're no longer covered
    //   (accountability visibility: tasks must not disappear after shift)
    const overdueRegardlessOfCoverage = tasksWithCoverage.filter(
      (t) => t.status !== "completed" && baseIsTaskOverdue(t) &&
        // Only re-add overdue tasks that were at the right location but lost coverage
        // for time/assignment reasons — NOT tasks from different locations entirely
        t.coverage?.noCoverageReason !== "location_mismatch"
    );

    const combined = [...covered];
    const seen = new Set(combined.map((t) => t.id));

    for (const t of overdueRegardlessOfCoverage) {
      if (seen.has(t.id)) continue;
      // Mark missed tasks for UI labeling
      if (!t.coverage?.hasCoverage) {
        t.visibility_reason = "missed_after_shift";
      }
      combined.push(t);
      seen.add(t.id);
    }

    visible = combined;
  } else {
    // Planning mode: show all, no-coverage are flagged
    visible = tasksWithCoverage;
  }

  // STAGE 6: Compute status/overdue
  // Overdue is deterministic: now > deadline (start_at+duration OR due_at)
  const now = getCanonicalNow();
  let overdueCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  for (const task of visible) {
    if (task.status === "completed") {
      completedCount++;
      continue;
    }

    if (baseIsTaskOverdue(task)) {
      overdueCount++;
      continue;
    }

    pendingCount++;
  }

  // Build debug stats
  const debug: PipelineDebugStats = {
    generated: generatedOccurrences.length,
    deduped: dedupedOccurrences.length,
    covered: covered.length,
    noCoverage: noCoverage.length,
    visible: visible.length,
    overdue: overdueCount,
    completed: completedCount,
    pending: pendingCount,
  };

  return {
    tasks: visible,
    covered,
    noCoverage,
    debug,
  };
}

/**
 * Run the unified pipeline for a date range (for calendar/dashboard views)
 */
export function runPipelineForDateRange(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date,
  options: PipelineOptions
): PipelineResult {
  const {
    viewMode,
    includeCompleted = true,
    includeVirtual = true,
    shifts = [],
    graceWindowMinutes = 30,
  } = options;

  // Collect all occurrences in range, day by day
  const allOccurrences: TaskWithCoverage[] = [];
  const seenIds = new Set<string>();
  
  let currentDate = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  while (currentDate <= end) {
    const dayOccurrences = getOccurrencesForDate(tasks, currentDate, {
      includeCompleted,
      includeVirtual,
      employeeId: options.employeeId,
      roleId: options.roleId,
      locationId: options.locationId,
    });

    for (const occ of dayOccurrences) {
      if (!seenIds.has(occ.id)) {
        seenIds.add(occ.id);
        const coverage = checkTaskCoverage(occ, shifts, currentDate, { 
          graceWindowMinutes,
          dayBasedCoverage: true, // Tasks stay visible after shift ends until end-of-day
        });
        allOccurrences.push({ ...occ, coverage });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // Separate by coverage
  const covered = allOccurrences.filter((t) => t.coverage?.hasCoverage);
  const noCoverage = allOccurrences.filter((t) => !t.coverage?.hasCoverage);

  // Apply view mode filter
  let visible: TaskWithCoverage[];
  if (viewMode === "execution") {
    visible = covered;
  } else {
    visible = allOccurrences;
  }

  // Compute stats
  const now = getCanonicalNow();
  let overdueCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  for (const task of visible) {
    if (task.status === "completed") {
      completedCount++;
    } else if (task.coverage?.hasCoverage && isTaskOverdueWithCoverage(task, task.coverage, now)) {
      overdueCount++;
    } else if (task.status !== "completed") {
      pendingCount++;
    }
  }

  const debug: PipelineDebugStats = {
    generated: allOccurrences.length,
    deduped: allOccurrences.length,
    covered: covered.length,
    noCoverage: noCoverage.length,
    visible: visible.length,
    overdue: overdueCount,
    completed: completedCount,
    pending: pendingCount,
  };

  return {
    tasks: visible,
    covered,
    noCoverage,
    debug,
  };
}

/**
 * Get today's tasks through the unified pipeline
 */
export function getTodayTasks(
  tasks: Task[],
  shifts: Shift[],
  options: Partial<PipelineOptions> = {}
): PipelineResult {
  return runPipelineForDate(tasks, getCanonicalToday(), {
    viewMode: options.viewMode || "execution",
    includeCompleted: options.includeCompleted ?? true,
    includeVirtual: options.includeVirtual ?? true,
    shifts,
    ...options,
  });
}

/**
 * Get tomorrow's tasks through the unified pipeline
 */
export function getTomorrowTasks(
  tasks: Task[],
  shifts: Shift[],
  options: Partial<PipelineOptions> = {}
): PipelineResult {
  return runPipelineForDate(tasks, getCanonicalTomorrow(), {
    viewMode: options.viewMode || "execution",
    includeCompleted: options.includeCompleted ?? false,
    includeVirtual: options.includeVirtual ?? true,
    shifts,
    ...options,
  });
}

/**
 * Check if a task is overdue (shift-aware)
 * Only covered tasks can be overdue
 */
export function isTaskOverdueShiftAware(
  task: Task,
  coverage?: CoverageResult,
  now: Date = new Date()
): boolean {
  // If no coverage info provided, fall back to base check
  if (!coverage) {
    return baseIsTaskOverdue(task);
  }
  
  return isTaskOverdueWithCoverage(task, coverage, now);
}

/**
 * Group tasks by status (shift-aware)
 * Overdue only applies to covered tasks
 */
export function groupTasksByStatusShiftAware(tasks: TaskWithCoverage[]): {
  pending: TaskWithCoverage[];
  overdue: TaskWithCoverage[];
  completed: TaskWithCoverage[];
  noCoverage: TaskWithCoverage[];
} {
  const pending: TaskWithCoverage[] = [];
  const overdue: TaskWithCoverage[] = [];
  const completed: TaskWithCoverage[] = [];
  const noCoverage: TaskWithCoverage[] = [];
  const now = getCanonicalNow();

  for (const task of tasks) {
    if (task.status === "completed") {
      completed.push(task);
      continue;
    }

    // Overdue must be visible even when not currently covered
    if (baseIsTaskOverdue(task)) {
      if (!task.coverage?.hasCoverage) {
        task.visibility_reason = "missed_after_shift";
      }
      overdue.push(task);
      continue;
    }

    // Not overdue: enforce coverage gating for execution views
    if (!task.coverage?.hasCoverage) {
      noCoverage.push(task);
      continue;
    }

    pending.push(task);
  }

  return { pending, overdue, completed, noCoverage };
}

// Re-export commonly used functions for convenience
export { getTaskDate, getTaskDeadline, isVirtualId };
export type { TaskWithCoverage };
