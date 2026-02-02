/**
 * Hook for mobile task views that applies the unified occurrence engine
 * to the user's tasks (from useMyTasks).
 * 
 * This ensures mobile parity with desktop Today/Tomorrow tabs.
 * Uses the unified pipeline for shift-aware task visibility.
 * 
 * TRAINING TASK VISIBILITY:
 * Training-generated tasks are ONLY visible on dates where the employee
 * has an APPROVED training shift assignment. This is enforced by filtering
 * out training tasks that don't match the employee's training schedule.
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
  getCompanyWeekday,
  getCompanyDayKey,
  normalizeDaysOfWeek,
} from "@/lib/taskOccurrenceEngine";
import { startOfDay, endOfDay, addDays, format } from "date-fns";

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
    /** Weekly recurrence diagnostics */
    weeklyRecurrence?: {
      companyTodayKey: string;
      companyTodayWeekday: number;
      companyTodayWeekdayName: string;
      weeklyTemplatesCount: number;
      weeklyTemplatesWithDaysOfWeek: number;
      templatesMatchingToday: number;
      templatesSummary: Array<{
        id: string;
        title: string;
        daysOfWeekRaw: number[] | null;
        normalizedDays: number[];
        matchesToday: boolean;
      }>;
    };
  };
}

// Types for training task visibility
interface TrainingTaskInfo {
  task_id: string;
  scheduled_date: string;
}

interface TrainingShiftDate {
  shift_date: string;
}

/**
 * Get the current user's tasks with occurrence expansion applied.
 * This mirrors the desktop Today/Tomorrow logic for mobile parity.
 * Uses unified pipeline for shift-aware filtering.
 */
export function useMyTaskOccurrences(): MyTaskOccurrences {
  const { data: rawTasks = [], isLoading, error } = useMyTasks();
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeCompanyId, setEmployeeCompanyId] = useState<string | null>(null);
  
  // Training task visibility state
  const [trainingTasksInfo, setTrainingTasksInfo] = useState<TrainingTaskInfo[]>([]);
  const [trainingShiftDates, setTrainingShiftDates] = useState<Set<string>>(new Set());
  const [trainingDataLoaded, setTrainingDataLoaded] = useState(false);

  // Fetch employee's company_id and id directly from employees table
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.id) return;
      
      const { data: emp } = await supabase
        .from("employees")
        .select("id, company_id")
        .eq("user_id", user.id)
        .single();
      
      if (emp) {
        setEmployeeId(emp.id);
        setEmployeeCompanyId(emp.company_id);
        if (import.meta.env.DEV) {
          console.log("[useMyTaskOccurrences] Employee data:", { id: emp.id, company_id: emp.company_id });
        }
      }
    };
    
    fetchEmployeeData();
  }, [user?.id]);

  // Fetch training task visibility data (training task IDs + training shift dates)
  useEffect(() => {
    const fetchTrainingVisibility = async () => {
      if (!employeeId) return;
      
      try {
        // 1. Get all training assignments for this employee (planned/active)
        const { data: assignments, error: assignmentsError } = await supabase
          .from("training_assignments")
          .select("id")
          .eq("trainee_employee_id", employeeId)
          .in("status", ["planned", "active"]);
        
        if (assignmentsError) {
          console.error("[useMyTaskOccurrences] Error fetching training assignments:", assignmentsError);
          setTrainingDataLoaded(true);
          return;
        }
        
        const assignmentIds = assignments?.map(a => a.id) || [];
        
        // 2. Get all training-generated task IDs + their scheduled dates
        let taskInfos: TrainingTaskInfo[] = [];
        if (assignmentIds.length > 0) {
          const { data: generatedTasks, error: tasksError } = await supabase
            .from("training_generated_tasks")
            .select("task_id, scheduled_date")
            .in("assignment_id", assignmentIds);
          
          if (tasksError) {
            console.error("[useMyTaskOccurrences] Error fetching training_generated_tasks:", tasksError);
          } else {
            taskInfos = (generatedTasks || []).filter(t => t.task_id && t.scheduled_date) as TrainingTaskInfo[];
          }
        }
        
        // 3. Get all training shift dates where this employee has an approved assignment
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data: shiftAssignments, error: shiftsError } = await supabase
          .from("shift_assignments")
          .select(`
            shifts!inner(shift_date, shift_type)
          `)
          .eq("staff_id", employeeId)
          .eq("approval_status", "approved")
          .gte("shifts.shift_date", today);
        
        if (shiftsError) {
          console.error("[useMyTaskOccurrences] Error fetching training shift assignments:", shiftsError);
        }
        
        // Filter to only training shifts and extract dates
        const trainingDates = new Set<string>();
        (shiftAssignments || []).forEach((sa: any) => {
          if (sa.shifts?.shift_type === 'training' && sa.shifts?.shift_date) {
            trainingDates.add(sa.shifts.shift_date);
          }
        });
        
        setTrainingTasksInfo(taskInfos);
        setTrainingShiftDates(trainingDates);
        setTrainingDataLoaded(true);
        
        if (import.meta.env.DEV) {
          console.log("[useMyTaskOccurrences] Training visibility data:", {
            assignmentsCount: assignmentIds.length,
            trainingTasksCount: taskInfos.length,
            trainingDatesCount: trainingDates.size,
            trainingDates: Array.from(trainingDates),
          });
        }
      } catch (err) {
        console.error("[useMyTaskOccurrences] Error in training visibility fetch:", err);
        setTrainingDataLoaded(true);
      }
    };
    
    fetchTrainingVisibility();
  }, [employeeId]);

  // Fetch shifts for today + tomorrow using employee's company_id
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(addDays(new Date(), 1)),
    enabled: !!employeeCompanyId,
    companyId: employeeCompanyId || undefined,
  });
  
  // Build a map for quick training task lookup: taskId -> scheduled_date
  const trainingTaskMap = useMemo(() => {
    const map = new Map<string, string>();
    trainingTasksInfo.forEach(t => {
      if (t.task_id) {
        map.set(t.task_id, t.scheduled_date);
      }
    });
    return map;
  }, [trainingTasksInfo]);
  
  /**
   * Filter function to enforce training task visibility:
   * - Non-training tasks: always visible
   * - Training tasks: only visible if their scheduled_date is in trainingShiftDates
   */
  const filterTrainingTaskVisibility = useMemo(() => {
    return (task: TaskWithCoverage): boolean => {
      const scheduledDate = trainingTaskMap.get(task.id);
      
      // Not a training task - always visible
      if (!scheduledDate) {
        return true;
      }
      
      // Training task - only visible if scheduled on a training day
      // If scheduled_date is missing or trainingShiftDates is empty, hide the task
      if (!scheduledDate || trainingShiftDates.size === 0) {
        return false;
      }
      
      return trainingShiftDates.has(scheduledDate);
    };
  }, [trainingTaskMap, trainingShiftDates]);

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

    // TRAINING TASK VISIBILITY FILTER:
    // Apply the filter to hide training tasks on non-training days
    const filteredTodayTasks = todayResult.tasks.filter(filterTrainingTaskVisibility);
    const filteredTomorrowTasks = tomorrowResult.tasks.filter(filterTrainingTaskVisibility);
    
    // Log training filter results
    if (import.meta.env.DEV && trainingTaskMap.size > 0) {
      const todayFiltered = todayResult.tasks.length - filteredTodayTasks.length;
      const tomorrowFiltered = tomorrowResult.tasks.length - filteredTomorrowTasks.length;
      console.log("[useMyTaskOccurrences] Training task filter applied:", {
        trainingTasksTotal: trainingTaskMap.size,
        trainingDatesCount: trainingShiftDates.size,
        todayFiltered,
        tomorrowFiltered,
      });
    }

    // Group today's tasks using shift-aware grouping (with training filter applied)
    const todayGrouped = groupTasksByStatusShiftAware(filteredTodayTasks);

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

    // WEEKLY RECURRENCE DIAGNOSTICS
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const companyTodayWeekday = getCompanyWeekday(new Date());
    const companyTodayKey = getCompanyDayKey(new Date());
    
    const weeklyTemplates = rawTasks.filter(
      (t) => t.recurrence_type === "weekly"
    );
    const weeklyTemplatesWithDaysOfWeek = weeklyTemplates.filter(
      (t) => t.recurrence_days_of_week && t.recurrence_days_of_week.length > 0
    );
    
    // Check which templates should recur today
    const templatesSummary = weeklyTemplates.slice(0, 5).map((t) => {
      const taskStartWeekday = t.start_at 
        ? getCompanyWeekday(new Date(t.start_at)) 
        : undefined;
      const normalizedDays = Array.from(
        normalizeDaysOfWeek(t.recurrence_days_of_week, taskStartWeekday)
      );
      const matchesToday = normalizedDays.includes(companyTodayWeekday);
      
      return {
        id: t.id.slice(0, 8),
        title: t.title.slice(0, 20),
        daysOfWeekRaw: t.recurrence_days_of_week,
        normalizedDays,
        matchesToday,
      };
    });
    
    const templatesMatchingToday = weeklyTemplates.filter((t) => {
      const taskStartWeekday = t.start_at 
        ? getCompanyWeekday(new Date(t.start_at)) 
        : undefined;
      const normalizedDays = normalizeDaysOfWeek(t.recurrence_days_of_week, taskStartWeekday);
      return normalizedDays.has(companyTodayWeekday);
    }).length;

    const weeklyRecurrence = {
      companyTodayKey,
      companyTodayWeekday,
      companyTodayWeekdayName: weekdayNames[companyTodayWeekday],
      weeklyTemplatesCount: weeklyTemplates.length,
      weeklyTemplatesWithDaysOfWeek: weeklyTemplatesWithDaysOfWeek.length,
      templatesMatchingToday,
      templatesSummary,
    };

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
          visible: filteredTodayTasks.length,
        },
        tomorrow: {
          generated: tomorrowResult.debug.generated,
          covered: tomorrowResult.debug.covered,
          visible: filteredTomorrowTasks.length,
        },
        coverageReasons,
        activeTasksCount: activeTasks.length,
        upcomingTasksCount: upcomingTasks.length,
        weeklyRecurrence,
      });
    }

    return {
      todayTasks: filteredTodayTasks,
      tomorrowTasks: filteredTomorrowTasks,
      todayGrouped,
      activeTasks,
      upcomingTasks,
      debug: {
        today: {
          generated: todayResult.debug.generated,
          covered: todayResult.debug.covered,
          noCoverage: todayResult.debug.noCoverage,
          visible: filteredTodayTasks.length,
        },
        tomorrow: {
          generated: tomorrowResult.debug.generated,
          covered: tomorrowResult.debug.covered,
          noCoverage: tomorrowResult.debug.noCoverage,
          visible: filteredTomorrowTasks.length,
        },
        coverageReasons,
        weeklyRecurrence,
      },
    };
  }, [rawTasks, shifts, filterTrainingTaskVisibility, trainingTaskMap, trainingShiftDates]);

  return {
    ...result,
    isLoading: isLoading || shiftsLoading || !trainingDataLoaded,
    error: error as Error | null,
    rawTasks,
    shifts, // Expose shifts for debug panel
  };
}
