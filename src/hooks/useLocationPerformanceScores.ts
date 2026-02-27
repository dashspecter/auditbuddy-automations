import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EmployeePerformanceScore } from "./useEmployeePerformance";

/**
 * Hook that calls the server-side `calculate_location_performance_scores` function.
 * This bypasses RLS issues that cause incorrect scores on kiosk/anonymous sessions.
 */
export const useLocationPerformanceScores = (
  locationId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["location-performance-scores", locationId, startDate, endDate],
    queryFn: async (): Promise<EmployeePerformanceScore[]> => {
      if (!locationId || !startDate || !endDate) return [];

      const { data, error } = await supabase.rpc(
        "calculate_location_performance_scores",
        {
          p_location_id: locationId,
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );

      if (error) throw error;

      // Map DB result to EmployeePerformanceScore interface
      return (data || []).map((row: any) => ({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        role: row.role,
        location_id: row.location_id,
        location_name: row.location_name,
        avatar_url: row.avatar_url,
        attendance_score: Number(row.attendance_score),
        punctuality_score: Number(row.punctuality_score),
        task_score: Number(row.task_score),
        test_score: Number(row.test_score),
        performance_review_score: Number(row.performance_review_score),
        base_score: Number(row.base_score),
        warning_penalty: Number(row.warning_penalty),
        warning_count: row.warning_count,
        warning_contributions: [],
        warning_monthly_caps: {},
        overall_score: Number(row.overall_score),
        shifts_scheduled: row.shifts_scheduled,
        shifts_worked: row.shifts_worked,
        shifts_missed: row.shifts_missed,
        late_count: row.late_count,
        total_late_minutes: row.total_late_minutes,
        tasks_assigned: row.tasks_assigned,
        tasks_completed: row.tasks_completed,
        tasks_completed_on_time: row.tasks_completed_on_time,
        tasks_overdue: row.tasks_overdue,
        tests_taken: row.tests_taken,
        tests_passed: row.tests_passed,
        average_test_score: Number(row.average_test_score),
        reviews_count: row.reviews_count,
        average_review_score: Number(row.average_review_score),
      }));
    },
    enabled: !!locationId && !!startDate && !!endDate,
    staleTime: 60000,
  });
};
