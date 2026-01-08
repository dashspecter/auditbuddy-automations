/**
 * Canonical Task Date Utilities
 * 
 * This module provides consistent date handling for tasks across the entire app.
 * All date comparisons use the same timezone logic to prevent inconsistencies.
 */

import { 
  startOfDay, 
  endOfDay, 
  addDays, 
  isSameDay, 
  isAfter, 
  isBefore,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  format,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths
} from "date-fns";
import type { Task } from "@/hooks/useTasks";

/**
 * Get the canonical "now" for all date calculations
 * Uses local timezone consistently
 */
export const getCanonicalNow = (): Date => new Date();

/**
 * Get start of today in canonical timezone
 */
export const getCanonicalToday = (): Date => startOfDay(getCanonicalNow());

/**
 * Get start of tomorrow in canonical timezone
 */
export const getCanonicalTomorrow = (): Date => startOfDay(addDays(getCanonicalNow(), 1));

/**
 * Check if a date falls within "today" window (00:00:00 - 23:59:59)
 */
export const isDateToday = (date: Date): boolean => {
  const today = getCanonicalToday();
  const todayEnd = endOfDay(today);
  return date >= today && date <= todayEnd;
};

/**
 * Check if a date falls within "tomorrow" window (00:00:00 - 23:59:59)
 */
export const isDateTomorrow = (date: Date): boolean => {
  const tomorrow = getCanonicalTomorrow();
  const tomorrowEnd = endOfDay(tomorrow);
  return date >= tomorrow && date <= tomorrowEnd;
};

/**
 * Get the relevant date for a task (start_at takes precedence over due_at)
 */
export const getTaskDate = (task: Task): Date | null => {
  if (task.start_at) return new Date(task.start_at);
  if (task.due_at) return new Date(task.due_at);
  return null;
};

/**
 * Get the deadline for a task
 * If start_at + duration_minutes exists, use that as deadline
 * Otherwise fall back to due_at
 */
export const getTaskDeadline = (task: Task): Date | null => {
  if (task.start_at && task.duration_minutes) {
    return new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000);
  }
  if (task.due_at) return new Date(task.due_at);
  return null;
};

/**
 * Check if a task is overdue
 * A task is ONLY overdue if:
 * 1. It has a deadline
 * 2. The deadline is in the past
 * 3. It's not completed
 */
export const isTaskOverdue = (task: Task): boolean => {
  if (task.status === "completed") return false;
  
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  
  return deadline < getCanonicalNow();
};

/**
 * Check if a task was completed late
 */
export const wasTaskCompletedLate = (task: Task): boolean => {
  if (task.status !== "completed" || !task.completed_at) return false;
  
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  
  return new Date(task.completed_at) > deadline;
};

/**
 * Determines which day bucket a task belongs to
 */
export const getTaskDayBucket = (task: Task): 'past' | 'today' | 'tomorrow' | 'future' | null => {
  const taskDate = getTaskDate(task);
  if (!taskDate) return null;
  
  const today = getCanonicalToday();
  const tomorrow = getCanonicalTomorrow();
  const dayAfterTomorrow = addDays(tomorrow, 1);
  
  if (taskDate < today) return 'past';
  if (taskDate < tomorrow) return 'today';
  if (taskDate < dayAfterTomorrow) return 'tomorrow';
  return 'future';
};

/**
 * Generate a unique stable key for a virtual task instance
 */
export const generateVirtualTaskKey = (task: Task, targetDate: Date): string => {
  return `${task.id}-virtual-${format(targetDate, 'yyyy-MM-dd')}`;
};

/**
 * Check if a task ID represents a virtual instance
 */
export const isVirtualTask = (taskId: string): boolean => {
  return taskId.includes('-virtual-');
};

/**
 * Check if a recurring task should occur on a specific target date
 * This is deterministic - same inputs always produce same output
 */
export const shouldRecurOnDate = (task: Task, targetDate: Date): boolean => {
  if (!task.recurrence_type || task.recurrence_type === 'none') return false;
  
  const taskDate = getTaskDate(task);
  if (!taskDate) return false;
  
  // Check if recurrence has ended
  if (task.recurrence_end_date && new Date(task.recurrence_end_date) < targetDate) {
    return false;
  }
  
  const interval = task.recurrence_interval || 1;
  const taskStartOfDay = startOfDay(taskDate);
  const targetStartOfDay = startOfDay(targetDate);
  
  // Target must be same day or after the original task
  if (targetStartOfDay < taskStartOfDay) return false;
  
  // If it's the same day as the original, the original task covers it
  if (isSameDay(taskDate, targetDate)) return false;
  
  switch (task.recurrence_type) {
    case 'daily': {
      const daysDiff = differenceInDays(targetStartOfDay, taskStartOfDay);
      return daysDiff > 0 && daysDiff % interval === 0;
    }
    
    case 'weekly': {
      // Check if same day of week
      if (targetDate.getDay() !== taskDate.getDay()) return false;
      
      const weeksDiff = differenceInWeeks(targetStartOfDay, taskStartOfDay);
      return weeksDiff > 0 && weeksDiff % interval === 0;
    }
    
    case 'monthly': {
      // Check if same day of month
      if (targetDate.getDate() !== taskDate.getDate()) return false;
      
      const monthsDiff = differenceInMonths(targetStartOfDay, taskStartOfDay);
      return monthsDiff > 0 && monthsDiff % interval === 0;
    }
    
    case 'weekdays': {
      // Monday = 1, Friday = 5
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend
      
      const daysDiff = differenceInDays(targetStartOfDay, taskStartOfDay);
      return daysDiff > 0 && daysDiff % interval === 0;
    }
    
    default:
      return false;
  }
};

/**
 * Create a virtual task instance for a recurring task on a specific date
 * The virtual instance has the same time as the original but on the target date
 */
export const createVirtualInstance = (task: Task, targetDate: Date): Task => {
  const taskDate = getTaskDate(task);
  if (!taskDate) return task;
  
  // Preserve the time from original task
  const hours = getHours(taskDate);
  const minutes = getMinutes(taskDate);
  const newDate = setMinutes(setHours(startOfDay(targetDate), hours), minutes);
  
  return {
    ...task,
    id: generateVirtualTaskKey(task, targetDate),
    start_at: task.start_at ? newDate.toISOString() : null,
    due_at: task.due_at ? newDate.toISOString() : null,
    status: 'pending', // Virtual instances are always pending
    completed_at: null,
    completed_by: null,
    completed_late: null,
    is_recurring_instance: true,
  };
};

/**
 * Check if a task was completed on a specific day
 */
export const wasCompletedOnDay = (task: Task, targetDate: Date): boolean => {
  if (!task.completed_at) return false;
  const completedAt = new Date(task.completed_at);
  return isSameDay(completedAt, targetDate);
};

/**
 * Get tasks for a specific day, including virtual recurring instances
 * Handles deduplication automatically
 * 
 * CRITICAL: Today must show ALL tasks scheduled for today regardless of status:
 * - Pending tasks scheduled today
 * - Overdue tasks (past deadline today)
 * - Completed tasks that were COMPLETED today (for recurring tasks)
 * - Completed tasks that were SCHEDULED for today
 */
export const getTasksForDay = (
  tasks: Task[], 
  targetDate: Date,
  options: { includeCompleted?: boolean } = {}
): Task[] => {
  const { includeCompleted = true } = options;
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);
  const result: Task[] = [];
  const seenTaskIds = new Set<string>();
  
  tasks.forEach(task => {
    const taskDate = getTaskDate(task);
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    
    // Case 1: Original task is scheduled on this day
    if (taskDate && taskDate >= targetStart && taskDate <= targetEnd) {
      if (!includeCompleted && task.status === 'completed') return;
      if (seenTaskIds.has(task.id)) return;
      seenTaskIds.add(task.id);
      result.push(task);
      return;
    }
    
    // Case 2: Recurring task that was COMPLETED on this day
    // Show it as a completed instance for this day
    if (isRecurring && task.status === 'completed' && includeCompleted) {
      if (wasCompletedOnDay(task, targetDate)) {
        const completedInstanceId = `${task.id}-completed-${format(targetDate, 'yyyy-MM-dd')}`;
        if (seenTaskIds.has(completedInstanceId)) return;
        seenTaskIds.add(completedInstanceId);
        
        // Create a virtual completed instance with today's date but completed status
        const virtualCompleted = createVirtualInstance(task, targetDate);
        virtualCompleted.status = 'completed';
        virtualCompleted.completed_at = task.completed_at;
        virtualCompleted.completed_by = task.completed_by;
        virtualCompleted.completed_late = task.completed_late;
        virtualCompleted.id = completedInstanceId;
        result.push(virtualCompleted);
        return;
      }
    }
    
    // Case 3: Recurring task should have a virtual instance on this day (pending only)
    if (isRecurring && shouldRecurOnDate(task, targetDate)) {
      // Skip completed tasks - they already have their completed instance handled above
      if (task.status === 'completed') return;
      
      const virtualId = generateVirtualTaskKey(task, targetDate);
      if (seenTaskIds.has(virtualId)) return;
      seenTaskIds.add(virtualId);
      
      result.push(createVirtualInstance(task, targetDate));
    }
  });
  
  // Sort by status (pending/overdue first, then completed) and then by time
  return result.sort((a, b) => {
    // Completed tasks go to the bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    
    const dateA = getTaskDate(a);
    const dateB = getTaskDate(b);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
};

/**
 * Get today's tasks with proper deduplication
 */
export const getTodayTasks = (tasks: Task[]): Task[] => {
  return getTasksForDay(tasks, getCanonicalToday(), { includeCompleted: true });
};

/**
 * Get tomorrow's tasks (pending only) with proper deduplication
 */
export const getTomorrowTasks = (tasks: Task[]): Task[] => {
  return getTasksForDay(tasks, getCanonicalTomorrow(), { includeCompleted: false });
};

/**
 * Get tasks happening right now (within their active window)
 */
export const getTasksHappeningNow = (tasks: Task[]): Task[] => {
  const now = getCanonicalNow();
  
  return getTodayTasks(tasks).filter(task => {
    if (task.status === 'completed') return false;
    if (!task.start_at) return false;
    
    const start = new Date(task.start_at);
    const end = task.duration_minutes 
      ? new Date(start.getTime() + task.duration_minutes * 60000)
      : new Date(start.getTime() + 30 * 60000); // default 30min window
    
    return now >= start && now <= end;
  });
};
