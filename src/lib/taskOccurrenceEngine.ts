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
  differenceInCalendarWeeks,
  format,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  getDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Task } from "@/hooks/useTasks";
import { getCompanyNow, toDayKey } from "@/lib/companyDayUtils";

// Default company timezone (Europe/Bucharest for Romania-based companies)
const COMPANY_TIMEZONE = "Europe/Bucharest";

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
// CANONICAL DATE HELPERS (single source of truth using company timezone)
// ============================================================

/**
 * Get the current time in company timezone
 */
export const getCanonicalNow = (): Date => getCompanyNow(COMPANY_TIMEZONE);

/**
 * Get today's date at start of day in company timezone
 */
export const getCanonicalToday = (): Date => startOfDay(getCanonicalNow());

/**
 * Get tomorrow's date at start of day in company timezone
 */
export const getCanonicalTomorrow = (): Date => startOfDay(addDays(getCanonicalNow(), 1));

/**
 * Get the weekday (0-6, Sun-Sat) for a date in company timezone
 */
export const getCompanyWeekday = (date: Date, timezone: string = COMPANY_TIMEZONE): number => {
  const zonedDate = toZonedTime(date, timezone);
  return getDay(zonedDate);
};

/**
 * Get the day key (yyyy-MM-dd) for a date in company timezone
 */
export const getCompanyDayKey = (date: Date, timezone: string = COMPANY_TIMEZONE): string => {
  return toDayKey(toZonedTime(date, timezone));
};

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
 * Generate a stable virtual task ID.
 * For multi-time slots, appends the time: "uuid-virtual-YYYY-MM-DD-HH:MM"
 */
export const generateVirtualId = (taskId: string, date: Date, timeSlot?: string): string => {
  const base = `${taskId}-virtual-${format(date, 'yyyy-MM-dd')}`;
  return timeSlot ? `${base}-${timeSlot.replace(':', '')}` : base;
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
 * Normalize recurrence_days_of_week to a Set of 0-6 (Sun-Sat)
 * Uses COMPANY TIMEZONE for fallback weekday calculation.
 * 
 * Handles various input formats:
 * - null/undefined: defaults to [weekday of start_at in company TZ]
 * - [0..6]: already correct format (0=Sunday, 6=Saturday)
 * - [1..7]: legacy format, needs conversion (7=Sunday -> 0)
 * 
 * @param input - Raw recurrence_days_of_week from task
 * @param fallbackWeekday - Weekday of task start_at (already in company TZ)
 */
export function normalizeDaysOfWeek(
  input: number[] | null | undefined,
  fallbackWeekday?: number
): Set<number> {
  if (!input || input.length === 0) {
    // Default to the weekday of the task's start_at in company timezone
    if (fallbackWeekday !== undefined && fallbackWeekday >= 0 && fallbackWeekday <= 6) {
      return new Set([fallbackWeekday]);
    }
    return new Set();
  }

  // Check if any value is > 6, which would indicate 1-7 format
  const maxVal = Math.max(...input);
  if (maxVal > 6) {
    // Convert 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
    // 1 (Mon) -> 1, 2 (Tue) -> 2, ..., 6 (Sat) -> 6, 7 (Sun) -> 0
    return new Set(input.map(d => d === 7 ? 0 : d));
  }

  return new Set(input);
}

/**
 * CORE RECURRENCE EXPANSION - generates ALL occurrence dates for a recurring task
 * within a given date range. This is the SINGLE algorithm used everywhere.
 * 
 * Uses COMPANY TIMEZONE for all weekday and day boundary calculations to ensure
 * consistency across server, browser, and mobile clients.
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
  
  // Use company timezone for day boundaries
  const taskStartDay = startOfDay(toZonedTime(taskDate, COMPANY_TIMEZONE));
  const taskTimeHours = getHours(toZonedTime(taskDate, COMPANY_TIMEZONE));
  const taskTimeMinutes = getMinutes(toZonedTime(taskDate, COMPANY_TIMEZONE));
  const taskStartWeekday = getCompanyWeekday(taskDate, COMPANY_TIMEZONE);

  // For weekly with days_of_week, we need special handling
  if (task.recurrence_type === 'weekly' && task.recurrence_days_of_week && task.recurrence_days_of_week.length > 0) {
    const daysOfWeek = normalizeDaysOfWeek(task.recurrence_days_of_week, taskStartWeekday);
    
    // DEV logging with full diagnostic info
    if (import.meta.env.DEV) {
      const todayKey = getCompanyDayKey(new Date(), COMPANY_TIMEZONE);
      const todayWeekday = getCompanyWeekday(new Date(), COMPANY_TIMEZONE);
      console.log('[recurrence] weekly expansion start', {
        taskId: task.id,
        title: task.title,
        daysOfWeekRaw: task.recurrence_days_of_week,
        normalizedDays: Array.from(daysOfWeek),
        taskStartDayKey: format(taskStartDay, 'yyyy-MM-dd'),
        taskStartWeekday,
        rangeStart: format(rangeStart, 'yyyy-MM-dd'),
        rangeEnd: format(rangeEnd, 'yyyy-MM-dd'),
        interval,
        timezone: COMPANY_TIMEZONE,
        companyTodayKey: todayKey,
        companyTodayWeekday: todayWeekday,
      });
    }

    // Iterate day-by-day through range using company timezone boundaries
    let currentDay = startOfDay(toZonedTime(rangeStart, COMPANY_TIMEZONE));
    const rangeEndDay = endOfDay(toZonedTime(rangeEnd, COMPANY_TIMEZONE));
    const recurrenceEndDay = endOfDay(toZonedTime(recurrenceEnd, COMPANY_TIMEZONE));
    let occurrenceCount = 0;

    while (currentDay <= rangeEndDay && currentDay <= recurrenceEndDay) {
      // Use differenceInCalendarWeeks for proper week interval math
      // weekStartsOn: 1 = Monday (ISO standard), 0 = Sunday
      const weekDiff = differenceInCalendarWeeks(currentDay, taskStartDay, { weekStartsOn: 1 });
      
      const weekday = getDay(currentDay); // Already in company TZ since currentDay is zoned
      const isCorrectDay = daysOfWeek.has(weekday);
      
      // Week interval check: first occurrence can be week 0 (same week as task start)
      // but must be AFTER the task start day
      const isCorrectInterval = weekDiff >= 0 && weekDiff % interval === 0;
      
      // TEMPLATE DAY RULE: The original task row represents the first occurrence.
      // Generated occurrences must be strictly AFTER the template day to avoid duplicates.
      // The template itself (task row) covers its own scheduled day.
      const isAfterTaskStart = currentDay > taskStartDay;

      if (isCorrectDay && isCorrectInterval && isAfterTaskStart) {
        // Create occurrence with preserved time from template
        const occurrence = setMinutes(setHours(new Date(currentDay), taskTimeHours), taskTimeMinutes);
        dates.push(occurrence);
        occurrenceCount++;

        if (import.meta.env.DEV) {
          console.log('[recurrence] weekly occurrence added', {
            taskId: task.id,
            date: format(occurrence, 'yyyy-MM-dd HH:mm'),
            dayKey: format(currentDay, 'yyyy-MM-dd'),
            weekday,
            weekDiff,
            interval,
          });
        }
      }

      currentDay = addDays(currentDay, 1);
    }

    if (import.meta.env.DEV) {
      console.log('[recurrence] weekly expansion complete', {
        taskId: task.id,
        occurrenceCount,
        normalizedDays: Array.from(daysOfWeek),
      });
    }

    return dates;
  }

  // Original logic for other recurrence types (daily, monthly, weekdays, simple weekly)
  let currentDate = new Date(taskDate);
  
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
        // Simple weekly without days_of_week - just advance by weeks
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
 * Create a virtual task instance for a specific date.
 * Preserves the time from the original task (or uses an explicit timeSlot override).
 */
export function createVirtualInstance(task: Task, targetDate: Date, timeSlot?: string): Task {
  const taskDate = getTaskDate(task);
  if (!taskDate) return task;

  let hours: number;
  let minutes: number;

  if (timeSlot) {
    // Parse "HH:MM" string
    const [h, m] = timeSlot.split(':').map(Number);
    hours = h;
    minutes = m;
  } else {
    hours = getHours(taskDate);
    minutes = getMinutes(taskDate);
  }

  const newDate = setMinutes(setHours(startOfDay(targetDate), hours), minutes);

  return {
    ...task,
    id: generateVirtualId(task.id, targetDate, timeSlot),
    start_at: task.start_at ? newDate.toISOString() : null,
    due_at: task.due_at ? newDate.toISOString() : null,
    status: 'pending',
    completed_at: null,
    completed_by: null,
    completed_late: null,
    is_recurring_instance: true,
    // Embed the scheduled time slot for completion identity
    _scheduled_time: timeSlot ?? null,
  } as Task & { _scheduled_time: string | null };
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

    // Determine time slots: use recurrence_times if present, else single slot
    const timeSlots: (string | undefined)[] =
      (task as any).recurrence_times && (task as any).recurrence_times.length >= 1
        ? (task as any).recurrence_times
        : [undefined];

    // Case 1: Original task is scheduled for this day
    if (taskDate && taskDate >= targetStart && taskDate <= targetEnd) {
      if (!includeCompleted && task.status === 'completed') continue;

      if (timeSlots.length > 1) {
        // Expand into one occurrence per time slot
        for (const slot of timeSlots) {
          const slotId = generateVirtualId(task.id, targetDate, slot);
          if (seenIds.has(slotId)) continue;
          seenIds.add(slotId);
          result.push(createVirtualInstance(task, targetDate, slot));
        }
      } else {
        if (seenIds.has(task.id)) continue;
        seenIds.add(task.id);
        result.push(task);
      }
      continue;
    }

    // Case 2: Recurring task completed on this day (show completed instance)
    if (isRecurring && task.status === 'completed' && includeCompleted && task.completed_at) {
      const completedAt = new Date(task.completed_at);
      if (isSameDay(completedAt, targetDate)) {
        const completedId = `${task.id}-completed-${format(targetDate, 'yyyy-MM-dd')}`;
        if (seenIds.has(completedId)) continue;
        seenIds.add(completedId);

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
      if (task.status === 'completed' && task.completed_at) {
        const completedAt = new Date(task.completed_at);
        if (isSameDay(completedAt, targetDate)) continue;
      }

      if (timeSlots.length > 1) {
        // Multi-time: generate one occurrence per slot
        for (const slot of timeSlots) {
          const slotId = generateVirtualId(task.id, targetDate, slot);
          if (seenIds.has(slotId)) continue;
          seenIds.add(slotId);
          result.push(createVirtualInstance(task, targetDate, slot));
        }
      } else {
        const virtualId = generateVirtualId(task.id, targetDate);
        if (seenIds.has(virtualId)) continue;
        seenIds.add(virtualId);
        result.push(createVirtualInstance(task, targetDate));
      }
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
