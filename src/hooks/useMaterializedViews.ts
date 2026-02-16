import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";

// ─── Types ───────────────────────────────────────────────────

export interface MvAuditStatsByLocation {
  company_id: string;
  location_id: string;
  location_name: string;
  total_audits: number;
  completed_audits: number;
  overdue_audits: number;
  avg_score: number | null;
  min_score: number | null;
  max_score: number | null;
  scored_audit_count: number;
  latest_audit_date: string | null;
}

export interface MvAuditSectionScore {
  company_id: string;
  audit_id: string;
  location_id: string;
  audit_date: string;
  template_id: string;
  section_id: string;
  section_name: string;
  section_score: number;
  field_count: number;
}

export interface MvAttendanceDailyStats {
  company_id: string;
  location_id: string;
  location_name: string;
  shift_date: string;
  staff_scheduled: number;
  staff_checked_in: number;
  late_count: number;
  total_late_minutes: number;
  auto_clockout_count: number;
}

export interface MvTaskCompletionStats {
  company_id: string;
  location_id: string;
  location_name: string;
  occurrence_date: string;
  tasks_with_completions: number;
  total_completions: number;
  on_time_completions: number;
  late_completions: number;
}

// ─── Hooks ───────────────────────────────────────────────────

/**
 * Pre-computed audit stats by location from materialized view.
 * Replaces expensive live aggregate queries on the dashboard.
 */
export const useMvAuditStats = () => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["mv-audit-stats", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_mv_audit_stats", {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data || []) as MvAuditStatsByLocation[];
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 min — views refresh every 15 min
  });
};

/**
 * Pre-computed section-level scores from materialized view.
 * Replaces the expensive field_responses join for performance trends.
 */
export const useMvSectionScores = (
  locationFilter?: string,
  dateFrom?: Date,
  dateTo?: Date,
  templateFilter?: string
) => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["mv-section-scores", companyId, locationFilter, dateFrom?.toISOString(), dateTo?.toISOString(), templateFilter],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_mv_section_scores", {
        p_company_id: companyId,
      });
      if (error) throw error;

      let filtered = (data || []) as MvAuditSectionScore[];

      // Apply client-side filters
      if (locationFilter && locationFilter !== "all") {
        filtered = filtered.filter((r) => r.location_id === locationFilter);
      }
      if (dateFrom) {
        filtered = filtered.filter((r) => new Date(r.audit_date) >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((r) => new Date(r.audit_date) <= dateTo);
      }
      if (templateFilter && templateFilter !== "all") {
        filtered = filtered.filter((r) => r.template_id === templateFilter);
      }

      return filtered;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Pre-computed daily attendance stats from materialized view.
 */
export const useMvAttendanceStats = (startDate?: string, endDate?: string) => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["mv-attendance-stats", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_mv_attendance_stats", {
        p_company_id: companyId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });
      if (error) throw error;
      return (data || []) as MvAttendanceDailyStats[];
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Pre-computed task completion stats from materialized view.
 */
export const useMvTaskStats = (startDate?: string, endDate?: string) => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["mv-task-stats", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_mv_task_stats", {
        p_company_id: companyId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });
      if (error) throw error;
      return (data || []) as MvTaskCompletionStats[];
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
};

// ─── Aggregated dashboard stats (replaces useDashboardStats for overview) ─────

export interface DashboardOverviewStats {
  totalAudits: number;
  completedAudits: number;
  overdueAudits: number;
  avgScore: number;
  worstLocation: { name: string; score: number };
  bestLocation: { name: string; score: number };
  isLoading: boolean;
}

/**
 * Dashboard overview stats derived from the materialized view.
 * Drop-in replacement for useDashboardStats when date filtering is not needed.
 */
export const useMvDashboardOverview = (): DashboardOverviewStats => {
  const { data: stats = [], isLoading } = useMvAuditStats();

  if (isLoading || stats.length === 0) {
    return {
      totalAudits: 0,
      completedAudits: 0,
      overdueAudits: 0,
      avgScore: 0,
      worstLocation: { name: "N/A", score: 0 },
      bestLocation: { name: "N/A", score: 0 },
      isLoading,
    };
  }

  const totalAudits = stats.reduce((s, r) => s + r.total_audits, 0);
  const completedAudits = stats.reduce((s, r) => s + r.completed_audits, 0);
  const overdueAudits = stats.reduce((s, r) => s + r.overdue_audits, 0);

  // Weighted average score
  const totalScored = stats.reduce((s, r) => s + r.scored_audit_count, 0);
  const weightedSum = stats.reduce(
    (s, r) => s + (r.avg_score || 0) * r.scored_audit_count,
    0
  );
  const avgScore = totalScored > 0 ? Math.round(weightedSum / totalScored) : 0;

  // Best / worst location
  const scored = stats
    .filter((r) => r.avg_score != null && r.avg_score > 0)
    .sort((a, b) => (a.avg_score || 0) - (b.avg_score || 0));

  const worstLocation = scored[0]
    ? { name: scored[0].location_name, score: scored[0].avg_score || 0 }
    : { name: "N/A", score: 0 };
  const bestLocation = scored[scored.length - 1]
    ? { name: scored[scored.length - 1].location_name, score: scored[scored.length - 1].avg_score || 0 }
    : { name: "N/A", score: 0 };

  return {
    totalAudits,
    completedAudits,
    overdueAudits,
    avgScore,
    worstLocation,
    bestLocation,
    isLoading,
  };
};
