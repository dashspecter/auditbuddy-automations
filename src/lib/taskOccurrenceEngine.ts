/**
 * UNIFIED TASK OCCURRENCE ENGINE
 * 
 * This is the SINGLE source of truth for expanding recurring tasks into occurrences.
 * ALL views (Calendar, Today, Tomorrow, All Tasks, By Employee, Mobile) MUST use this engine.
 * 
 * Root cause of previous mismatch: Calendar used generateOccurrences() with date iteration,
 * while Today/Tomorrow used shouldRecurOnDate() with date-difference calculations.
 * These algorithms produced different results for edge cases.
 */

import {
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isAfter,
  isBefore,
  differenceInDays,
  format,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
} from "date-fns";
import type { Task } from "@/hooks/useTasks";

// ============================================================
// TYPES
// ============================================================

export interface TaskOccurrence {
  /** Unique ID for this occurrence (original ID or virtual ID) */
  id: string;
  /** Original task template */
  task: Task;
  /** The date this occurrence is scheduled for */
  scheduledDate: Date;
  /** Whether this is a virtual (future recurring) instance */
  isVirtual: boolean;
  /** Whether this occurrence is overdue */
  isOverdue: boolean;
  /** Whether this occurrence was completed late */
  wasCompletedLate: boolean;
}

export interface OccurrenceQueryOptions {
  /** Include completed occurrences */
  includeCompleted?: boolean;
  /** Include virtual (future recurring) instances */
  includeVirtual?: boolean;
  /** Filter by specific employee ID */
  employeeId?: string;
  /** Filter by specific role ID */
  roleId?: string;
  /** Filter by specific location ID */
  locationId?: string;
}

// ============================================================
// CANONICAL DATE HELPERS (single source of truth)
// ============================================================

export const getCanonicalNow = (): Date => new Date();
export const getCanonicalToday = (): Date => startOfDay(getCanonicalNow());
export const getCanonicalTomorrow = (): Date => startOfDay(addDays(getCanonicalNow(), 1));

/**
 * Get the primary date for a task (start_at takes precedence)
 */
export const getTaskDate = (task: Task): Date | null => {
  if (task.start_at) return new Date(task.start_at);
  if (task.due_at) return new Date(task.due_at);
  return null;
};

/**
 * Get task deadline (start_at + duration OR due_at)
 */
export const getTaskDeadline = (task: Task): Date | null => {
  if (task.start_at && task.duration_minutes) {
    return new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000);
  }
  if (task.due_at) return new Date(task.due_at);
  return null;
};

/**
 * Check if date is within today's window (00:00:00 - 23:59:59)
 */
export const isDateInToday = (date: Date): boolean => {
  const today = getCanonicalToday();
  return date >= today && date <= endOfDay(today);
};

/**
 * Check if date is within tomorrow's window
 */
export const isDateInTomorrow = (date: Date): boolean => {
  const tomorrow = getCanonicalTomorrow();
  return date >= tomorrow && date <= endOfDay(tomorrow);
};

// ============================================================
// OCCURRENCE ENGINE CORE
// ============================================================

/**
 * Generate a stable virtual task ID
 */
export const generateVirtualId = (taskId: string, date: Date): string => {
  return `${taskId}-virtual-${format(date, 'yyyy-MM-dd')}`;
};

/**
 * Check if an ID is a virtual occurrence (includes virtual or completed suffixes)
 */
export const isVirtualId = (id: string): boolean => {
  return id.includes('-virtual-') || id.includes('-completed-');
};

/**
 * Extract the original task ID from a virtual/occurrence ID
 * Handles patterns like:
 * - uuid-virtual-2026-01-08
 * - uuid-completed-2026-01-08
 */
export const getOriginalTaskId = (id: string): string => {
  // Check for -virtual- or -completed- suffix and extract the UUID part
  const virtualMatch = id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (virtualMatch) {
    return virtualMatch[1];
  }
  return id;
};

/**
 * CORE RECURRENCE EXPANSION - generates ALL occurrence dates for a recurring task
 * within a given date range. This is the SINGLE algorithm used everywhere.
 */
export function getRecurrenceOccurrenceDates(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  
  if (!task.recurrence_type || task.recurrence_type === 'none') {
    return dates;
  }
  
  const taskDate = getTaskDate(task);
  if (!taskDate) return dates;
  
  const interval = task.recurrence_interval || 1;
  const recurrenceEnd = task.recurrence_end_date 
    ? new Date(task.recurrence_end_date) 
    : rangeEnd;
  
  // Start from the task's original date
  let currentDate = new Date(taskDate);
  const taskStartDay = startOfDay(taskDate);
  
  // Iterate through potential occurrence dates
  while (currentDate <= rangeEnd && currentDate <= recurrenceEnd) {
    const currentDay = startOfDay(currentDate);
    
    // Only include dates within range and AFTER the original task date
    // (the original task covers its own day)
    if (currentDay >= rangeStart && currentDay > taskStartDay) {
      dates.push(new Date(currentDate));
    }
    
    // Advance to next occurrence based on recurrence type
    switch (task.recurrence_type) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'weekdays':
        // Advance by interval days, but skip weekends
        currentDate = addDays(currentDate, 1);
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate = addDays(currentDate, 1);
        }
        // Apply interval (every N weekdays)
        if (interval > 1) {
          for (let i = 1; i < interval; i++) {
            currentDate = addDays(currentDate, 1);
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
              currentDate = addDays(currentDate, 1);
            }
          }
        }
        break;
      default:
        return dates; // Unknown type, stop
    }
  }
  
  return dates;
}

/**
 * Check if a recurring task has an occurrence on a specific date
 */
export function shouldRecurOnDate(task: Task, targetDate: Date): boolean {
  if (!task.recurrence_type || task.recurrence_type === 'none') {
    return false;
  }
  
  const taskDate = getTaskDate(task);
  if (!taskDate) return false;
  
  const targetDay = startOfDay(targetDate);
  const taskDay = startOfDay(taskDate);
  
  // If it's the same day as the original, the original covers it
  if (isSameDay(targetDate, taskDate)) return false;
  
  // Must be after the original
  if (targetDay <= taskDay) return false;
  
  // Check recurrence end
  if (task.recurrence_end_date && targetDay > new Date(task.recurrence_end_date)) {
    return false;
  }
  
  // Generate occurrences for just that day's range to check
  const dates = getRecurrenceOccurrenceDates(
    task,
    targetDay,
    endOfDay(targetDate)
  );
  
  return dates.some(d => isSameDay(d, targetDate));
}

/**
 * Create a virtual task instance for a specific date
 * Preserves the time from the original task
 */
export function createVirtualInstance(task: Task, targetDate: Date): Task {
  const taskDate = getTaskDate(task);
  if (!taskDate) return task;
  
  // Preserve time from original
  const hours = getHours(taskDate);
  const minutes = getMinutes(taskDate);
  const newDate = setMinutes(setHours(startOfDay(targetDate), hours), minutes);
  
  return {
    ...task,
    id: generateVirtualId(task.id, targetDate),
    start_at: task.start_at ? newDate.toISOString() : null,
    due_at: task.due_at ? newDate.toISOString() : null,
    status: 'pending',
    completed_at: null,
    completed_by: null,
    completed_late: null,
    is_recurring_instance: true,
  };
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed') return false;
  
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  
  return deadline < getCanonicalNow();
}

/**
 * Check if a task was completed late
 */
export function wasTaskCompletedLate(task: Task): boolean {
  if (task.status !== 'completed' || !task.completed_at) return false;
  
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  
  return new Date(task.completed_at) > deadline;
}

// ============================================================
// PUBLIC API - Use these in all views
// ============================================================

/**
 * Get all task occurrences for a specific date
 * This is the PRIMARY function for Today/Tomorrow/Day views
 */
export function getOccurrencesForDate(
  tasks: Task[],
  targetDate: Date,
  options: OccurrenceQueryOptions = {}
): Task[] {
  const { includeCompleted = true, includeVirtual = true } = options;
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);
  const result: Task[] = [];
  const seenIds = new Set<string>();
  
  for (const task of tasks) {
    const taskDate = getTaskDate(task);
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    
    // Case 1: Original task is scheduled for this day
    if (taskDate && taskDate >= targetStart && taskDate <= targetEnd) {
      if (!includeCompleted && task.status === 'completed') continue;
      if (seenIds.has(task.id)) continue;
      seenIds.add(task.id);
      result.push(task);
      continue;
    }
    
    // Case 2: Recurring task completed on this day (show completed instance)
    if (isRecurring && task.status === 'completed' && includeCompleted && task.completed_at) {
      const completedAt = new Date(task.completed_at);
      if (isSameDay(completedAt, targetDate)) {
        const completedId = `${task.id}-completed-${format(targetDate, 'yyyy-MM-dd')}`;
        if (seenIds.has(completedId)) continue;
        seenIds.add(completedId);
        
        // Create instance with completion info preserved
        const virtualCompleted = createVirtualInstance(task, targetDate);
        virtualCompleted.id = completedId;
        virtualCompleted.status = 'completed';
        virtualCompleted.completed_at = task.completed_at;
        virtualCompleted.completed_by = task.completed_by;
        virtualCompleted.completed_late = task.completed_late;
        result.push(virtualCompleted);
        continue;
      }
    }
    
    // Case 3: Recurring task should have a virtual instance on this day
    if (isRecurring && includeVirtual && shouldRecurOnDate(task, targetDate)) {
      // Skip if the task is already completed (handled above)
      if (task.status === 'completed') continue;
      
      const virtualId = generateVirtualId(task.id, targetDate);
      if (seenIds.has(virtualId)) continue;
      seenIds.add(virtualId);
      
      result.push(createVirtualInstance(task, targetDate));
    }
  }
  
  // Sort: pending/overdue first, then completed, then by time
  return result.sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    
    const dateA = getTaskDate(a);
    const dateB = getTaskDate(b);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get all occurrences for a date range (for Calendar view)
 * Returns calendar-formatted events
 */
export function getOccurrencesForDateRange(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date,
  options: OccurrenceQueryOptions = {}
): Array<{
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: Task;
}> {
  const events: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: Task;
  }> = [];
  const seenIds = new Set<string>();
  
  for (const task of tasks) {
    const taskDate = getTaskDate(task);
    if (!taskDate) continue;
    
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    const duration = task.duration_minutes || 0;
    
    // Always include the original task if in range
    if (taskDate >= rangeStart && taskDate <= rangeEnd) {
      const endDate = duration > 0
        ? new Date(taskDate.getTime() + duration * 60000)
        : new Date(taskDate);
      
      if (!seenIds.has(task.id)) {
        seenIds.add(task.id);
        events.push({
          id: task.id,
          title: task.title,
          start: taskDate,
          end: endDate,
          allDay: !task.start_at,
          resource: task,
        });
      }
    }
    
    // For recurring tasks, generate all occurrences in range
    if (isRecurring) {
      const occurrenceDates = getRecurrenceOccurrenceDates(task, rangeStart, rangeEnd);
      
      for (const occDate of occurrenceDates) {
        const virtualId = generateVirtualId(task.id, occDate);
        if (seenIds.has(virtualId)) continue;
        seenIds.add(virtualId);
        
        const endDate = duration > 0
          ? new Date(occDate.getTime() + duration * 60000)
          : new Date(occDate);
        
        // Create virtual instance for display
        const virtualTask = createVirtualInstance(task, occDate);
        
        events.push({
          id: virtualId,
          title: task.title,
          start: occDate,
          end: endDate,
          allDay: !task.start_at,
          resource: virtualTask,
        });
      }
    }
  }
  
  return events;
}

/**
 * Get today's occurrences
 */
export function getTodayOccurrences(tasks: Task[]): Task[] {
  return getOccurrencesForDate(tasks, getCanonicalToday(), { includeCompleted: true });
}

/**
 * Get tomorrow's occurrences (pending only by default)
 */
export function getTomorrowOccurrences(tasks: Task[]): Task[] {
  return getOccurrencesForDate(tasks, getCanonicalTomorrow(), { includeCompleted: false });
}

/**
 * Get tasks that are happening RIGHT NOW
 */
export function getOccurrencesHappeningNow(tasks: Task[]): Task[] {
  const now = getCanonicalNow();
  const todayTasks = getTodayOccurrences(tasks);
  
  return todayTasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.start_at) return false;
    
    const start = new Date(task.start_at);
    const end = task.duration_minutes
      ? new Date(start.getTime() + task.duration_minutes * 60000)
      : new Date(start.getTime() + 30 * 60000); // Default 30min window
    
    return now >= start && now <= end;
  });
}

/**
 * Group tasks by status for display
 */
export function groupOccurrencesByStatus(tasks: Task[]): {
  pending: Task[];
  overdue: Task[];
  completed: Task[];
} {
  const pending: Task[] = [];
  const overdue: Task[] = [];
  const completed: Task[] = [];
  
  for (const task of tasks) {
    if (task.status === 'completed') {
      completed.push(task);
    } else if (isTaskOverdue(task)) {
      overdue.push(task);
    } else {
      pending.push(task);
    }
  }
  
  return { pending, overdue, completed };
}
