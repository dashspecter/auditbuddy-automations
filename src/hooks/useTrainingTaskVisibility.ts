/**
 * Hook to determine if training tasks should be visible for a trainee on a given date.
 * A trainee only sees training tasks on days where they have a scheduled training session/shift.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface TrainingTaskVisibilityOptions {
  employeeId?: string;
  date?: Date | string;
  enabled?: boolean;
}

/**
 * Check if an employee has a training shift on a specific date
 */
export const useHasTrainingShiftOnDate = (options: TrainingTaskVisibilityOptions) => {
  const { employeeId, date, enabled = true } = options;
  const dateStr = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;

  return useQuery({
    queryKey: ["training-shift-check", employeeId, dateStr],
    queryFn: async () => {
      if (!employeeId || !dateStr) return false;

      // Check if employee has a shift assignment for a training shift on this date
      const { data, error } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          shifts!inner(
            id,
            shift_date,
            shift_type
          )
        `)
        .eq("staff_id", employeeId)
        .eq("approval_status", "approved")
        .eq("shifts.shift_date", dateStr)
        .eq("shifts.shift_type", "training")
        .limit(1);

      if (error) {
        console.error("Error checking training shift:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: enabled && !!employeeId && !!dateStr,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

/**
 * Get all training task IDs for an assignment
 */
export const useTrainingTaskIds = (assignmentId?: string) => {
  return useQuery({
    queryKey: ["training-task-ids", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await supabase
        .from("training_generated_tasks")
        .select("task_id")
        .eq("assignment_id", assignmentId);

      if (error) {
        console.error("Error fetching training task IDs:", error);
        return [];
      }

      return data.map(t => t.task_id);
    },
    enabled: !!assignmentId,
  });
};

/**
 * Get training task info for filtering in task views
 */
export const useTrainingGeneratedTasksForEmployee = (employeeId?: string) => {
  return useQuery({
    queryKey: ["training-generated-tasks-employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      // Get all training assignments for this employee
      const { data: assignments, error: assignmentsError } = await supabase
        .from("training_assignments")
        .select("id")
        .eq("trainee_employee_id", employeeId)
        .in("status", ["planned", "active"]);

      if (assignmentsError || !assignments?.length) return [];

      const assignmentIds = assignments.map(a => a.id);

      // Get all generated tasks for these assignments
      const { data, error } = await supabase
        .from("training_generated_tasks")
        .select("task_id, scheduled_date, assignment_id")
        .in("assignment_id", assignmentIds);

      if (error) {
        console.error("Error fetching training tasks:", error);
        return [];
      }

      return data;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get training shifts for an employee in a date range
 */
export const useTrainingShiftsForEmployee = (
  employeeId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["training-shifts-employee", employeeId, startDate, endDate],
    queryFn: async () => {
      if (!employeeId) return [];

      let query = supabase
        .from("shift_assignments")
        .select(`
          id,
          shifts!inner(
            id,
            shift_date,
            shift_type,
            start_time,
            end_time
          )
        `)
        .eq("staff_id", employeeId)
        .eq("approval_status", "approved")
        .eq("shifts.shift_type", "training");

      if (startDate) {
        query = query.gte("shifts.shift_date", startDate);
      }
      if (endDate) {
        query = query.lte("shifts.shift_date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching training shifts:", error);
        return [];
      }

      return data.map((sa: any) => ({
        assignmentId: sa.id,
        date: sa.shifts.shift_date,
        shiftId: sa.shifts.id,
      }));
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Filter tasks to only show training tasks on training days
 * Returns a function that can be used to filter tasks
 */
export function filterTrainingTasks<T extends { id: string }>(
  tasks: T[],
  trainingTaskIds: string[],
  trainingDates: string[],
  getTaskDate: (task: T) => string | undefined
): T[] {
  const trainingTaskIdSet = new Set(trainingTaskIds);
  const trainingDateSet = new Set(trainingDates);

  return tasks.filter(task => {
    // If not a training task, always show
    if (!trainingTaskIdSet.has(task.id)) {
      return true;
    }

    // Training task - only show if scheduled on a training day
    const taskDate = getTaskDate(task);
    if (!taskDate) return false;

    return trainingDateSet.has(taskDate);
  });
}
