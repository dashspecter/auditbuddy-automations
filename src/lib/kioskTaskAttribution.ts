import { startOfDay, endOfDay, startOfWeek, endOfWeek, isPast, parseISO, isWithinInterval, format } from "date-fns";

/**
 * Kiosk-specific task attribution logic.
 * Correctly attributes tasks to employees by:
 * 1. Direct assignment (assigned_to = employee_id)
 * 2. Role assignment (task has assigned_role that matches employee's role)
 * 
 * Also correctly counts overdue tasks (due_at < now, not just today).
 */

export interface KioskTask {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
  role_ids?: string[];
  role_names?: string[];
  due_at: string | null;
  start_at: string | null;
  completed_at: string | null;
  completed_late: boolean | null;
  completed_by: string | null; // Employee ID who actually completed the task
}

export interface ScheduledEmployee {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

export interface KioskEmployeeTaskMetrics {
  employee_id: string;
  employee_name: string;
  role: string;
  avatar_url: string | null;
  // Task counts for "today" window
  assigned_open_today: number;      // pending/overdue tasks due today OR already overdue
  completed_today: number;          // tasks completed today
  completed_on_time_today: number;  // tasks completed today with completed_late=false
  // Task counts for "week" window
  assigned_week_total: number;      // tasks due in week + overdue backlog
  completed_week: number;           // tasks completed in week
  completed_on_time_week: number;   // tasks completed in week with completed_late=false
  // Derived scores
  weekly_task_score: number | null; // (completed_on_time_week / assigned_week_total) * 100 or null
}

/**
 * Check if an employee matches a task (by direct assignment or role)
 */
function taskMatchesEmployee(
  task: KioskTask,
  employee: ScheduledEmployee
): boolean {
  // Direct assignment
  if (task.assigned_to === employee.id) {
    return true;
  }
  
  // Role-based assignment (case-insensitive match)
  if (task.role_names && task.role_names.length > 0) {
    const employeeRoleLower = employee.role?.toLowerCase().trim() || "";
    return task.role_names.some(
      roleName => roleName.toLowerCase().trim() === employeeRoleLower
    );
  }
  
  return false;
}

/**
 * Check if a task is due on a given date (or already overdue)
 */
function isTaskDueOnDateOrOverdue(task: KioskTask, targetDate: Date): boolean {
  const taskDueDate = task.due_at || task.start_at;
  if (!taskDueDate) return false;
  
  const dueDate = parseISO(taskDueDate);
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);
  
  // Task is due on target date
  if (isWithinInterval(dueDate, { start: targetStart, end: targetEnd })) {
    return true;
  }
  
  // Task is overdue (due before target date start)
  if (dueDate < targetStart) {
    return true;
  }
  
  return false;
}

/**
 * Check if a task is due within a date range (or already overdue entering the range)
 */
function isTaskDueInRangeOrOverdue(
  task: KioskTask, 
  rangeStart: Date, 
  rangeEnd: Date
): boolean {
  const taskDueDate = task.due_at || task.start_at;
  if (!taskDueDate) return false;
  
  const dueDate = parseISO(taskDueDate);
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = endOfDay(rangeEnd);
  
  // Task due within range
  if (isWithinInterval(dueDate, { start: rangeStartDay, end: rangeEndDay })) {
    return true;
  }
  
  // Task is overdue (due before range start) - backlog
  if (dueDate < rangeStartDay) {
    return true;
  }
  
  return false;
}

/**
 * Check if a task was completed on a specific date BY a specific employee
 * CRITICAL: Only count completions if the employee actually completed the task
 */
function wasCompletedOnDateByEmployee(
  task: KioskTask, 
  targetDate: Date, 
  employeeId: string
): boolean {
  if (task.status !== "completed" || !task.completed_at) return false;
  
  // CRITICAL FIX: Only count if this employee actually completed the task
  if (task.completed_by !== employeeId) return false;
  
  const completedAt = parseISO(task.completed_at);
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);
  
  return isWithinInterval(completedAt, { start: targetStart, end: targetEnd });
}

/**
 * Check if a task was completed within a date range BY a specific employee
 * CRITICAL: Only count completions if the employee actually completed the task
 */
function wasCompletedInRangeByEmployee(
  task: KioskTask, 
  rangeStart: Date, 
  rangeEnd: Date,
  employeeId: string
): boolean {
  if (task.status !== "completed" || !task.completed_at) return false;
  
  // CRITICAL FIX: Only count if this employee actually completed the task
  if (task.completed_by !== employeeId) return false;
  
  const completedAt = parseISO(task.completed_at);
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = endOfDay(rangeEnd);
  
  return isWithinInterval(completedAt, { start: rangeStartDay, end: rangeEndDay });
}

/**
 * Compute task metrics for kiosk employees.
 * Correctly attributes role-based tasks and counts overdue tasks.
 */
export function computeKioskTaskMetrics(
  tasks: KioskTask[],
  scheduledEmployees: ScheduledEmployee[],
  today: Date
): KioskEmployeeTaskMetrics[] {
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  
  return scheduledEmployees.map(employee => {
    // Get all tasks that match this employee (by direct assignment OR role)
    const employeeTasks = tasks.filter(task => taskMatchesEmployee(task, employee));
    
    // Today's metrics
    // Open tasks: pending/in_progress/overdue that are due today OR already overdue
    const openTasksToday = employeeTasks.filter(task => {
      if (task.status === "completed") return false;
      return isTaskDueOnDateOrOverdue(task, today);
    });
    
    // Completed today - ONLY count tasks this employee actually completed
    const completedToday = employeeTasks.filter(task => 
      wasCompletedOnDateByEmployee(task, today, employee.id)
    );
    
    // Completed on time today
    const completedOnTimeToday = completedToday.filter(task => !task.completed_late);
    
    // Weekly metrics
    // Assigned this week: tasks due in week + overdue backlog
    const assignedWeekTotal = employeeTasks.filter(task => {
      // Include completed tasks in the "assigned" count for proper scoring
      return isTaskDueInRangeOrOverdue(task, weekStart, weekEnd);
    });
    
    // Completed this week - ONLY count tasks this employee actually completed
    const completedWeek = employeeTasks.filter(task =>
      wasCompletedInRangeByEmployee(task, weekStart, weekEnd, employee.id)
    );
    
    // Completed on time this week
    const completedOnTimeWeek = completedWeek.filter(task => !task.completed_late);
    
    // Weekly task score: (completed_on_time / assigned) * 100
    const weeklyTaskScore = assignedWeekTotal.length > 0
      ? (completedOnTimeWeek.length / assignedWeekTotal.length) * 100
      : null;
    
    return {
      employee_id: employee.id,
      employee_name: employee.full_name,
      role: employee.role,
      avatar_url: employee.avatar_url,
      assigned_open_today: openTasksToday.length,
      completed_today: completedToday.length,
      completed_on_time_today: completedOnTimeToday.length,
      assigned_week_total: assignedWeekTotal.length,
      completed_week: completedWeek.length,
      completed_on_time_week: completedOnTimeWeek.length,
      weekly_task_score: weeklyTaskScore,
    };
  });
}

/**
 * Get Today's Champions - ranked by completed tasks today
 */
export function getTodaysChampions(
  metrics: KioskEmployeeTaskMetrics[],
  limit: number = 3
): KioskEmployeeTaskMetrics[] {
  // Only include employees with any activity (completed OR assigned open tasks)
  const withActivity = metrics.filter(
    m => m.completed_today > 0 || m.assigned_open_today > 0
  );
  
  // Sort: completed_today (desc), completed_on_time_today (desc), fewer open tasks (asc)
  return withActivity
    .sort((a, b) => {
      // Primary: completed today
      if (b.completed_today !== a.completed_today) {
        return b.completed_today - a.completed_today;
      }
      // Tie-breaker 1: completed on time today
      if (b.completed_on_time_today !== a.completed_on_time_today) {
        return b.completed_on_time_today - a.completed_on_time_today;
      }
      // Tie-breaker 2: fewer late completions
      const aLate = a.completed_today - a.completed_on_time_today;
      const bLate = b.completed_today - b.completed_on_time_today;
      return aLate - bLate;
    })
    .slice(0, limit);
}

/**
 * Get Weekly Stars - ranked by weekly_task_score
 * This avoids the "100 default" problem by computing score based on actual tasks.
 */
export function getWeeklyStars(
  metrics: KioskEmployeeTaskMetrics[],
  limit: number = 3
): KioskEmployeeTaskMetrics[] {
  // Only include employees with tasks assigned this week
  const withActivity = metrics.filter(m => m.assigned_week_total > 0);
  
  // Sort: weekly_task_score (desc, nulls last), completed_on_time_week (desc), completed_week (desc)
  return withActivity
    .sort((a, b) => {
      // Primary: weekly task score
      const aScore = a.weekly_task_score ?? -1;
      const bScore = b.weekly_task_score ?? -1;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      // Tie-breaker 1: completed on time this week
      if (b.completed_on_time_week !== a.completed_on_time_week) {
        return b.completed_on_time_week - a.completed_on_time_week;
      }
      // Tie-breaker 2: total completed this week
      return b.completed_week - a.completed_week;
    })
    .slice(0, limit);
}
