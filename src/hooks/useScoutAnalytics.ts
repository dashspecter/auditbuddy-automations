import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

/**
 * Hook for company-scoped scout analytics data.
 * Aggregates from scout_jobs, scout_submissions, scout_payouts, scouts.
 */

export interface ScoutAnalyticsKPIs {
  totalJobs: number;
  acceptanceRate: number;
  avgCompletionDays: number;
  avgScoutRating: number;
  disputeRate: number;
}

export interface FunnelData {
  posted: number;
  accepted: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface WeeklyCompletion {
  week: string;
  completed: number;
}

export interface LocationStats {
  location_id: string;
  location_name: string;
  total: number;
  approved: number;
  rejected: number;
  passRate: number;
}

export interface LeaderboardEntry {
  scout_id: string;
  full_name: string;
  reliability_score: number;
  completed_jobs_count: number;
  rating: number;
}

export interface PayoutSummary {
  totalPaid: number;
  totalPending: number;
  currency: string;
}

export function useScoutAnalyticsKPIs() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-kpis", companyId],
    queryFn: async (): Promise<ScoutAnalyticsKPIs> => {
      // Get all jobs
      const { data: jobs } = await supabase
        .from("scout_jobs")
        .select("id, status, created_at, approved_at")
        .eq("company_id", companyId!);

      const allJobs = jobs ?? [];
      const totalJobs = allJobs.length;

      // Acceptance rate: jobs that moved past 'posted'
      const accepted = allJobs.filter(j => j.status !== "posted" && j.status !== "cancelled").length;
      const acceptanceRate = totalJobs > 0 ? Math.round((accepted / totalJobs) * 100) : 0;

      // Avg completion time (created_at → approved_at)
      const completedJobs = allJobs.filter(j => j.approved_at && j.created_at);
      const avgCompletionDays = completedJobs.length > 0
        ? Math.round(completedJobs.reduce((sum, j) => {
            const diff = new Date(j.approved_at!).getTime() - new Date(j.created_at!).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0) / completedJobs.length * 10) / 10
        : 0;

      // Avg scout rating — get scouts that have jobs for this company
      const { data: scoutIds } = await supabase
        .from("scout_jobs")
        .select("assigned_scout_id")
        .eq("company_id", companyId!)
        .not("assigned_scout_id", "is", null);

      const uniqueScoutIds = [...new Set((scoutIds ?? []).map(s => s.assigned_scout_id).filter(Boolean))];
      let avgScoutRating = 0;
      if (uniqueScoutIds.length > 0) {
        const { data: scouts } = await supabase
          .from("scouts")
          .select("rating")
          .in("id", uniqueScoutIds as string[])
          .not("rating", "is", null);
        const ratings = (scouts ?? []).map(s => s.rating).filter(Boolean) as number[];
        avgScoutRating = ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;
      }

      // Dispute rate (cast to avoid TS2589 deep instantiation)
      const { count: disputeCount } = await (supabase as any)
        .from("scout_disputes")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!);

      const disputeRate = totalJobs > 0 ? Math.round(((disputeCount ?? 0) / totalJobs) * 100) : 0;

      return { totalJobs, acceptanceRate, avgCompletionDays, avgScoutRating, disputeRate };
    },
    enabled: !!companyId,
  });
}

export function useScoutAnalyticsFunnel() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-funnel", companyId],
    queryFn: async (): Promise<FunnelData> => {
      const { data: jobs } = await supabase
        .from("scout_jobs")
        .select("status")
        .eq("company_id", companyId!);

      const all = jobs ?? [];
      return {
        posted: all.filter(j => j.status === "posted").length,
        accepted: all.filter(j => j.status === "accepted").length,
        submitted: all.filter(j => j.status === "submitted").length,
        approved: all.filter(j => j.status === "approved").length,
        rejected: all.filter(j => j.status === "rejected").length,
      };
    },
    enabled: !!companyId,
  });
}

export function useScoutAnalyticsWeeklyTrend() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-weekly", companyId],
    queryFn: async (): Promise<WeeklyCompletion[]> => {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const { data: jobs } = await supabase
        .from("scout_jobs")
        .select("approved_at")
        .eq("company_id", companyId!)
        .eq("status", "approved")
        .gte("approved_at", twelveWeeksAgo.toISOString());

      const weeks: Record<string, number> = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        const weekKey = `W${String(getISOWeek(d)).padStart(2, "0")}`;
        weeks[weekKey] = 0;
      }

      (jobs ?? []).forEach(j => {
        if (!j.approved_at) return;
        const d = new Date(j.approved_at);
        const weekKey = `W${String(getISOWeek(d)).padStart(2, "0")}`;
        if (weekKey in weeks) weeks[weekKey]++;
      });

      return Object.entries(weeks)
        .map(([week, completed]) => ({ week, completed }))
        .reverse();
    },
    enabled: !!companyId,
  });
}

export function useScoutAnalyticsLocationStats() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-locations", companyId],
    queryFn: async (): Promise<LocationStats[]> => {
      const { data: jobs } = await supabase
        .from("scout_jobs")
        .select("location_id, status, locations(name)")
        .eq("company_id", companyId!);

      const map: Record<string, { name: string; total: number; approved: number; rejected: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jobs ?? []).forEach((j: any) => {
        const lid = j.location_id;
        if (!lid) return;
        if (!map[lid]) map[lid] = { name: j.locations?.name ?? "Unknown", total: 0, approved: 0, rejected: 0 };
        map[lid].total++;
        if (j.status === "approved") map[lid].approved++;
        if (j.status === "rejected") map[lid].rejected++;
      });

      return Object.entries(map).map(([location_id, v]) => ({
        location_id,
        location_name: v.name,
        total: v.total,
        approved: v.approved,
        rejected: v.rejected,
        passRate: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
      })).sort((a, b) => b.total - a.total);
    },
    enabled: !!companyId,
  });
}

export function useScoutLeaderboard() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-leaderboard", companyId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Get scout IDs that have jobs for this company
      const { data: scoutIds } = await supabase
        .from("scout_jobs")
        .select("assigned_scout_id")
        .eq("company_id", companyId!)
        .not("assigned_scout_id", "is", null);

      const uniqueIds = [...new Set((scoutIds ?? []).map(s => s.assigned_scout_id).filter(Boolean))];
      if (uniqueIds.length === 0) return [];

      const { data: scouts } = await supabase
        .from("scouts")
        .select("id, full_name, reliability_score, rating, completed_jobs_count")
        .in("id", uniqueIds as string[])
        .eq("status", "active")
        .order("reliability_score", { ascending: false })
        .limit(10);

      return (scouts ?? []).map(s => ({
        scout_id: s.id,
        full_name: s.full_name,
        reliability_score: s.reliability_score ?? 0,
        completed_jobs_count: s.completed_jobs_count ?? 0,
        rating: s.rating ?? 0,
      }));
    },
    enabled: !!companyId,
  });
}

export function useScoutPayoutSummary() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["scout-analytics-payouts", companyId],
    queryFn: async (): Promise<PayoutSummary> => {
      // Cast to avoid TS2589 deep instantiation on scout_payouts
      const { data: payouts } = await (supabase as any)
        .from("scout_payouts")
        .select("amount, status, currency")
        .eq("company_id", companyId!);

      const all = payouts ?? [];
      const totalPaid = all.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
      const totalPending = all.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount ?? 0), 0);
      const currency = all[0]?.currency ?? "RON";

      return { totalPaid, totalPending, currency };
    },
    enabled: !!companyId,
  });
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
