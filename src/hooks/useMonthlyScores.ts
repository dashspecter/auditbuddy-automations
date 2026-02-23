import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIME } from "@/lib/constants";

export interface MonthlyScoreRow {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  effective_score: number | null;
  used_components: number;
  attendance_score: number | null;
  punctuality_score: number | null;
  task_score: number | null;
  test_score: number | null;
  review_score: number | null;
  warning_penalty: number | null;
  rank_in_location: number | null;
  created_at: string;
}

/**
 * Fetch the last N months of archived scores for a given employee.
 */
export function useMonthlyScores(employeeId: string | null, limit = 6) {
  return useQuery({
    queryKey: ["monthly-scores", employeeId, limit],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("performance_monthly_scores" as any)
        .select("*")
        .eq("employee_id", employeeId)
        .order("month", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as MonthlyScoreRow[];
    },
    enabled: !!employeeId,
    staleTime: STALE_TIME.LONG,
  });
}
