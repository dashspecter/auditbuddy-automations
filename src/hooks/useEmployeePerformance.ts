import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { WarningContribution } from "./useWarningPenalty";
import { useCompany } from "@/hooks/useCompany";

export interface EmployeePerformanceScore {
  employee_id: string;
  employee_name: string;
  role: string;
  location_id: string;
  location_name: string;
  avatar_url: string | null;
  // Component scores (0-100)
  attendance_score: number;
  punctuality_score: number;
  task_score: number;
  test_score: number;
  performance_review_score: number;
  // Base score before warning deductions
  base_score: number;
  // Warning penalty
  warning_penalty: number;
  warning_count: number;
  warning_contributions: WarningContribution[];
  warning_monthly_caps: Record<string, { raw: number; capped: number }>;
  // Overall score (0-100) - Base minus warning penalty
  overall_score: number;
  // Raw metrics
  shifts_scheduled: number;
  shifts_worked: number;
  shifts_missed: number;
  late_count: number;
  total_late_minutes: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_completed_on_time: number;
  tasks_overdue: number;
  // Test metrics
  tests_taken: number;
  tests_passed: number;
  average_test_score: number;
  // Performance review metrics
  reviews_count: number;
  average_review_score: number;
}

/**
 * Maps a single row from the RPC result to EmployeePerformanceScore.
 */
function mapRpcRow(row: any): EmployeePerformanceScore {
  return {
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
  };
}

export const useEmployeePerformance = (
  startDate?: string,
  endDate?: string,
  locationId?: string
) => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  // Realtime subscriptions for performance-related tables — scoped to this company
  useEffect(() => {
    if (!startDate || !endDate || !company?.id) return;

    const companyId = company.id;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['employee-performance'], exact: false });
    };

    const channels = [
      supabase
        .channel(`attendance_logs_performance_${companyId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'attendance_logs',
          filter: `company_id=eq.${companyId}`,
        }, invalidate)
        .subscribe(),
      supabase
        .channel(`tasks_performance_${companyId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'tasks',
          filter: `company_id=eq.${companyId}`,
        }, invalidate)
        .subscribe(),
      supabase
        .channel(`test_submissions_performance_${companyId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'test_submissions',
          filter: `company_id=eq.${companyId}`,
        }, invalidate)
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [startDate, endDate, company?.id, queryClient]);

  return useQuery({
    queryKey: ["employee-performance", startDate, endDate, locationId],
    queryFn: async (): Promise<EmployeePerformanceScore[]> => {
      if (!startDate || !endDate) return [];

      if (locationId) {
        // Single location — one RPC call
        const { data, error } = await supabase.rpc(
          "calculate_location_performance_scores",
          { p_location_id: locationId, p_start_date: startDate, p_end_date: endDate }
        );
        if (error) throw error;
        const scores = (data || []).map(mapRpcRow);
        scores.sort((a, b) => b.overall_score - a.overall_score);
        return scores;
      }

      // All locations — fetch locations, then call RPC per location in parallel
      const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id")
        .eq("status", "active");

      if (locError) throw locError;
      if (!locations || locations.length === 0) return [];

      const results = await Promise.all(
        locations.map(async (loc) => {
          const { data, error } = await supabase.rpc(
            "calculate_location_performance_scores",
            { p_location_id: loc.id, p_start_date: startDate, p_end_date: endDate }
          );
          if (error) {
            console.error(`RPC error for location ${loc.id}:`, error);
            return [];
          }
          return (data || []).map(mapRpcRow);
        })
      );

      // Merge and deduplicate by employee_id, keeping highest score
      const seen = new Map<string, ReturnType<typeof mapRpcRow>>();
      for (const score of results.flat()) {
        const existing = seen.get(score.employee_id);
        if (!existing || score.overall_score > existing.overall_score) {
          seen.set(score.employee_id, score);
        }
      }
      const allScores = Array.from(seen.values());
      allScores.sort((a, b) => b.overall_score - a.overall_score);
      return allScores;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Get leaderboard (top performers)
export const usePerformanceLeaderboard = (
  startDate?: string,
  endDate?: string,
  locationId?: string,
  limit: number = 10
) => {
  const { data: allScores = [], isLoading } = useEmployeePerformance(
    startDate,
    endDate,
    locationId
  );

  const leaderboard = allScores.slice(0, limit);

  // Group by location for location-specific leaderboards
  const byLocation = allScores.reduce((acc, score) => {
    if (!acc[score.location_id]) {
      acc[score.location_id] = {
        location_id: score.location_id,
        location_name: score.location_name,
        employees: [],
      };
    }
    acc[score.location_id].employees.push(score);
    return acc;
  }, {} as Record<string, { location_id: string; location_name: string; employees: EmployeePerformanceScore[] }>);

  return {
    leaderboard,
    byLocation: Object.values(byLocation),
    allScores,
    isLoading,
  };
};
