/**
 * Hook for mobile task views that applies the unified occurrence engine
 * to the user's tasks (from useMyTasks).
 * 
 * This ensures mobile parity with desktop Today/Tomorrow tabs.
 * Uses the unified pipeline for shift-aware task visibility.
 */

import { useMemo, useState, useEffect } from "react";
import { useMyTasks, Task } from "./useTasks";
import { useShiftCoverage } from "./useShiftCoverage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  /** Shifts fetched for coverage */
  shifts: import("@/lib/taskCoverageEngine").Shift[];
  /** Debug stats for diagnostics */
  debug?: {
    today: { generated: number; covered: number; visible: number; noCoverage: number };
    tomorrow: { generated: number; covered: number; visible: number; noCoverage: number };
    /** Coverage reason buckets */
    coverageReasons?: {
      noShift: number;
      roleMismatch: number;
      locationMismatch: number;
      noApprovedAssignments: number;
      taskRoleNameMissing: number;
    };
  };
}

/**
 * Get the current user's tasks with occurrence expansion applied.
 * This mirrors the desktop Today/Tomorrow logic for mobile parity.
 * Uses unified pipeline for shift-aware filtering.
 */
export function useMyTaskOccurrences(): MyTaskOccurrences {
  const { data: rawTasks = [], isLoading, error } = useMyTasks();
  const { user } = useAuth();
  const [employeeCompanyId, setEmployeeCompanyId] = useState<string | null>(null);

  // Fetch employee's company_id directly from employees table (not CompanyContext)
  // This is critical because staff users are NOT in company_users table
  useEffect(() => {
    const fetchEmployeeCompanyId = async () => {
      if (!user?.id) return;
      
      const { data: emp } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      
      if (emp?.company_id) {
        setEmployeeCompanyId(emp.company_id);
        if (import.meta.env.DEV) {
          console.log("[useMyTaskOccurrences] Employee company_id:", emp.company_id);
        }
      }
    };
    
    fetchEmployeeCompanyId();
  }, [user?.id]);

  // Fetch shifts for today + tomorrow using employee's company_id
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(addDays(new Date(), 1)),
    enabled: !!employeeCompanyId, // Only fetch when we have employee's company
    companyId: employeeCompanyId || undefined, // Pass company_id explicitly
  });

  const result = useMemo(() => {
    const today = getCanonicalToday();
    const tomorrow = getCanonicalTomorrow();
    const now = new Date();

    // Count recurring templates in raw tasks
    const recurringTemplates = rawTasks.filter(
      (t) => t.recurrence_type && t.recurrence_type !== "none"
    );

    // DEV: Log shifts being passed to coverage engine
    if (import.meta.env.DEV) {
      console.log("[useMyTaskOccurrences] Shifts for coverage:", {
        shiftsCount: shifts.length,
        shiftDetails: shifts.slice(0, 3).map((s) => ({
          id: s.id?.slice(0, 8),
          date: s.shift_date,
          role: s.role,
          location_id: s.location_id?.slice(0, 8),
          assignmentsCount: s.shift_assignments?.length || 0,
          approvedCount: (s.shift_assignments || []).filter(
            (a: any) => a.approval_status === "approved" || a.approval_status === "confirmed"
          ).length,
        })),
      });
    }

    // Apply unified pipeline for Today (execution mode = only covered tasks)
    // dayBasedCoverage=true ensures tasks remain visible after shift ends until end-of-day
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

    // Compute coverage reason buckets for diagnostics
    const coverageReasons = {
      noShift: 0,
      roleMismatch: 0,
      locationMismatch: 0,
      noApprovedAssignments: 0,
      taskRoleNameMissing: 0,
    };
    
    for (const task of todayResult.noCoverage) {
      const reason = task.coverage?.noCoverageReason;
      if (reason === "no_shift") coverageReasons.noShift++;
      else if (reason === "role_mismatch") coverageReasons.roleMismatch++;
      else if (reason === "location_mismatch") coverageReasons.locationMismatch++;
      else if (reason === "no_approved_assignments") coverageReasons.noApprovedAssignments++;
      else if (reason === "task_role_name_missing") coverageReasons.taskRoleNameMissing++;
    }

    // DEBUG: Log pipeline stages for mobile parity verification
    if (import.meta.env.DEV) {
      console.log("[useMyTaskOccurrences] Mobile task pipeline:", {
        rawTasksCount: rawTasks.length,
        recurringTemplatesCount: recurringTemplates.length,
        shiftsCount: shifts.length,
        today: {
          generated: todayResult.debug.generated,
          covered: todayResult.debug.covered,
          noCoverage: todayResult.debug.noCoverage,
          visible: todayResult.debug.visible,
        },
        tomorrow: {
          generated: tomorrowResult.debug.generated,
          covered: tomorrowResult.debug.covered,
          visible: tomorrowResult.debug.visible,
        },
        coverageReasons,
        activeTasksCount: activeTasks.length,
        upcomingTasksCount: upcomingTasks.length,
      });
    }

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
          noCoverage: todayResult.debug.noCoverage,
          visible: todayResult.debug.visible,
        },
        tomorrow: {
          generated: tomorrowResult.debug.generated,
          covered: tomorrowResult.debug.covered,
          noCoverage: tomorrowResult.debug.noCoverage,
          visible: tomorrowResult.debug.visible,
        },
        coverageReasons,
      },
    };
  }, [rawTasks, shifts]);

  return {
    ...result,
    isLoading: isLoading || shiftsLoading,
    error: error as Error | null,
    rawTasks,
    shifts, // Expose shifts for debug panel
  };
}
