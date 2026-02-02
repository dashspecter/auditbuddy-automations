/**
 * SHIFT-AWARE TASK COVERAGE ENGINE
 * 
 * Filters tasks based on whether there is shift coverage (scheduled employees)
 * for the task's location, time window, and role requirements.
 * 
 * Rules:
 * - shift_based tasks: Only appear if coverage exists (employee scheduled)
 * - always_on tasks: Always appear regardless of schedule
 */

import { Task } from "@/hooks/useTasks";
import { format, parseISO, startOfDay, endOfDay, addMinutes } from "date-fns";
import { normalizeRoleName, rolesMatch, toDayKey, getCompanyDayWindow } from "./companyDayUtils";

// =============================================================
// TYPES
// =============================================================

export interface Shift {
  id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  /** Role name (string) from shifts table - this is the ONLY role field available */
  role: string;
  is_published?: boolean;
  shift_assignments?: Array<{
    id: string;
    staff_id: string;
    approval_status: string;
  }>;
}

export interface CoverageResult {
  /** Whether this task has coverage (scheduled employees) */
  hasCoverage: boolean;
  /** List of scheduled employee IDs who can cover this task */
  coveredByEmployees: string[];
  /** Reason if no coverage (for debugging) */
  noCoverageReason?: "no_shift" | "role_mismatch" | "location_mismatch" | "day_mismatch" | "no_approved_assignments" | "task_role_name_missing";
  /** Details for managers */
  coverageDetails?: {
    locationName?: string;
    requiredRole?: string;
    timeWindow?: string;
  };
  /** Debug info for diagnostics */
  debugInfo?: {
    shiftsChecked: number;
    roleChecks: number;
    locationChecks: number;
  };
}

export interface TaskWithCoverage extends Task {
  /** Coverage information computed by the engine */
  coverage?: CoverageResult;
  /** Why this task is visible to the user (used for UI badges / debug) */
  visibility_reason?: "missed_after_shift";
}

export interface CoverageCheckOptions {
  /** Grace window in minutes for shift matching (default: 30) */
  graceWindowMinutes?: number;
  /** Include always_on tasks without coverage check */
  includeAlwaysOn?: boolean;
  /** Whether to filter out tasks without coverage */
  filterNoCoverage?: boolean;
  /** 
   * If true, only check that shift EXISTS on day (not that task time is within shift window).
   * This ensures tasks remain visible after shift ends until end-of-day.
   * Default: true for mobile/execution views.
   */
  /** 
   * If true, only check that shift EXISTS on day (not that task time is within shift window).
   * This ensures tasks remain visible after shift ends until end-of-day.
   * ALSO: Pre-shift visibility - tasks visible even before shift starts if employee is scheduled.
   * Default: true for mobile/execution views.
   */
  dayBasedCoverage?: boolean;
}

// =============================================================
// COVERAGE ENGINE
// =============================================================

/**
 * Check if a time falls within a shift window (with grace period)
 */
function isTimeWithinShift(
  taskTime: string | null,
  shiftStart: string,
  shiftEnd: string,
  graceMinutes: number = 30
): boolean {
  if (!taskTime) return true; // No specific time = matches any shift on that day
  
  // Parse times (format: "HH:mm" or "HH:mm:ss")
  const parseTime = (t: string): number => {
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  };
  
  const taskMinutes = parseTime(taskTime);
  const shiftStartMin = parseTime(shiftStart) - graceMinutes;
  const shiftEndMin = parseTime(shiftEnd) + graceMinutes;
  
  // Handle overnight shifts
  if (shiftEndMin < shiftStartMin) {
    return taskMinutes >= shiftStartMin || taskMinutes <= shiftEndMin;
  }
  
  return taskMinutes >= shiftStartMin && taskMinutes <= shiftEndMin;
}

/**
 * Extract time string (HH:mm) from a date/timestamp
 */
function getTimeFromDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm');
}

/**
 * Check coverage for a single task against available shifts
 */
export function checkTaskCoverage(
  task: Task,
  shifts: Shift[],
  targetDate: Date,
  options: CoverageCheckOptions = {}
): CoverageResult {
  const { graceWindowMinutes = 30, dayBasedCoverage = true } = options;
  
  // Always-on tasks always have coverage (they don't depend on schedule)
  const executionMode = (task as any).execution_mode || 'shift_based';
  if (executionMode === 'always_on') {
    return {
      hasCoverage: true,
      coveredByEmployees: [],
      coverageDetails: { locationName: 'Always On' },
    };
  }
  
  // Use canonical day key to avoid UTC/local mismatch
  const dayWindow = getCompanyDayWindow(targetDate);
  const taskDateStr = dayWindow.dayKey;
  const taskTime = task.start_at ? getTimeFromDate(task.start_at) : null;
  const locationId = task.location_id;
  const roleId = task.assigned_role_id;
  const roleName = task.assigned_role?.name;
  const assignedTo = task.assigned_to;
  
  // Find matching shifts for this date using canonical day key
  const dateShifts = shifts.filter(s => s.shift_date === taskDateStr && s.is_published !== false);
  
  // Debug tracking
  let roleChecks = 0;
  let locationChecks = 0;
  
  if (dateShifts.length === 0) {
    return {
      hasCoverage: false,
      coveredByEmployees: [],
      noCoverageReason: "no_shift",
      coverageDetails: { timeWindow: taskDateStr },
      debugInfo: { shiftsChecked: 0, roleChecks: 0, locationChecks: 0 },
    };
  }
  
  // Find shifts that match location, role (and optionally time)
  const matchingShifts: Shift[] = [];
  const coveredEmployees: string[] = [];
  let lastMismatchReason: CoverageResult["noCoverageReason"] = undefined;
  
  for (const shift of dateShifts) {
    // Location check (global tasks with NULL location match any location)
    locationChecks++;
    if (locationId && shift.location_id !== locationId) {
      lastMismatchReason = "location_mismatch";
      continue;
    }
    
    // Time window check - ONLY if dayBasedCoverage is false (legacy behavior)
    // When dayBasedCoverage is true (default), tasks remain visible all day if shift existed
    if (!dayBasedCoverage && taskTime && !isTimeWithinShift(taskTime, shift.start_time, shift.end_time, graceWindowMinutes)) {
      continue;
    }
    
    // CRITICAL: Role check - if task requires a role, shift MUST have matching role name
    // NOTE: shifts table only has 'role' (text), there is NO role_id column
    roleChecks++;
    if (roleId || roleName) {
      // Task requires a role - we MUST have a role name to compare
      if (!roleName) {
        // Task has assigned_role_id but the join didn't resolve the name
        // This is a data issue - log it in DEV and mark as no coverage
        if (import.meta.env.DEV) {
          console.warn("[checkTaskCoverage] Task has assigned_role_id but missing role name:", {
            taskId: task.id,
            taskTitle: task.title,
            assigned_role_id: roleId,
            assigned_role: task.assigned_role,
          });
        }
        lastMismatchReason = "task_role_name_missing";
        continue;
      }
      
      // Use normalized name comparison (case-insensitive, trimmed, diacritics removed)
      const roleMatches = rolesMatch(shift.role, roleName);
      
      if (!roleMatches) {
        lastMismatchReason = "role_mismatch";
        continue;
      }
    }
    
    // Check if shift has approved assignments
    const approvedAssignments = (shift.shift_assignments || []).filter(
      a => a.approval_status === 'approved' || a.approval_status === 'confirmed'
    );
    
    if (approvedAssignments.length === 0) {
      // DEV logging for diagnostics
      if (import.meta.env.DEV) {
        const allStatuses = (shift.shift_assignments || []).map((a: any) => a.approval_status);
        if (allStatuses.length > 0) {
          console.log("[checkTaskCoverage] Shift has assignments but none approved:", {
            taskId: task.id?.slice(0, 8),
            shiftId: shift.id?.slice(0, 8),
            assignmentStatuses: allStatuses,
          });
        }
      }
      lastMismatchReason = "no_approved_assignments";
      continue;
    }
    
    // If task is assigned to specific employee, check if that employee is in this shift
    if (assignedTo) {
      const employeeAssigned = approvedAssignments.some(a => a.staff_id === assignedTo);
      if (!employeeAssigned) continue;
    }
    
    matchingShifts.push(shift);
    approvedAssignments.forEach(a => {
      if (!coveredEmployees.includes(a.staff_id)) {
        coveredEmployees.push(a.staff_id);
      }
    });
  }
  
  if (matchingShifts.length === 0) {
    return {
      hasCoverage: false,
      coveredByEmployees: [],
      noCoverageReason: lastMismatchReason || "no_shift",
      coverageDetails: {
        requiredRole: roleName,
        timeWindow: taskTime || undefined,
      },
      debugInfo: { shiftsChecked: dateShifts.length, roleChecks, locationChecks },
    };
  }
  
  return {
    hasCoverage: true,
    coveredByEmployees: coveredEmployees,
    debugInfo: { shiftsChecked: dateShifts.length, roleChecks, locationChecks },
  };
}

/**
 * Filter and annotate tasks with coverage information
 */
export function applyShiftCoverage(
  tasks: Task[],
  shifts: Shift[],
  targetDate: Date,
  options: CoverageCheckOptions = {}
): TaskWithCoverage[] {
  const { filterNoCoverage = true, includeAlwaysOn = true } = options;
  
  const result: TaskWithCoverage[] = [];
  
  for (const task of tasks) {
    const coverage = checkTaskCoverage(task, shifts, targetDate, options);
    
    const taskWithCoverage: TaskWithCoverage = {
      ...task,
      coverage,
    };
    
    // Filter based on coverage
    if (filterNoCoverage && !coverage.hasCoverage) {
      continue;
    }
    
    result.push(taskWithCoverage);
  }
  
  return result;
}

/**
 * Get tasks grouped by coverage status (for manager views)
 */
export function groupTasksByCoverage(
  tasks: Task[],
  shifts: Shift[],
  targetDate: Date,
  options: CoverageCheckOptions = {}
): {
  covered: TaskWithCoverage[];
  noCoverage: TaskWithCoverage[];
} {
  const covered: TaskWithCoverage[] = [];
  const noCoverage: TaskWithCoverage[] = [];
  
  for (const task of tasks) {
    const coverage = checkTaskCoverage(task, shifts, targetDate, options);
    const taskWithCoverage: TaskWithCoverage = { ...task, coverage };
    
    if (coverage.hasCoverage) {
      covered.push(taskWithCoverage);
    } else {
      noCoverage.push(taskWithCoverage);
    }
  }
  
  return { covered, noCoverage };
}

/**
 * Check if a task should be considered overdue
 * Only shift_based tasks with coverage can be overdue
 */
export function isTaskOverdueWithCoverage(
  task: Task,
  coverage: CoverageResult,
  now: Date = new Date()
): boolean {
  // Completed tasks are never overdue
  if (task.status === 'completed') return false;
  
  // Tasks without coverage cannot be overdue
  if (!coverage.hasCoverage) return false;
  
  // Check deadline
  let deadline: Date | null = null;
  
  if (task.start_at && task.duration_minutes) {
    deadline = addMinutes(new Date(task.start_at), task.duration_minutes);
  } else if (task.due_at) {
    deadline = new Date(task.due_at);
  }
  
  if (!deadline) return false;
  
  return now > deadline;
}
