import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScoutAuth } from "./useScoutAuth";

export interface MyStats {
  jobsCompleted: number;
  onTimeRate: number;
  approvalRate: number;
  totalEarned: number;
  currency: string;
}

export interface MonthlyEarning {
  month: string;
  amount: number;
}

export interface JobHistoryItem {
  id: string;
  title: string;
  status: string;
  approved_at: string | null;
  created_at: string;
}

export function useScoutMyStats() {
  const { scoutId } = useScoutAuth();

  return useQuery({
    queryKey: ["scout-performance-stats", scoutId],
    queryFn: async (): Promise<MyStats> => {
      if (!scoutId) throw new Error("No scout");

      // Get all jobs assigned to this scout
      const { data: jobs } = await supabase
        .from("scout_jobs")
        .select("id, status, approved_at, time_window_end")
        .eq("assigned_scout_id", scoutId);

      const all = jobs ?? [];
      const completed = all.filter(j => ["approved", "rejected", "paid"].includes(j.status));
      const approved = all.filter(j => ["approved", "paid"].includes(j.status));

      // On-time: approved before time_window_end
      const onTime = completed.filter(j => {
        if (!j.approved_at || !j.time_window_end) return true;
        return new Date(j.approved_at) <= new Date(j.time_window_end);
      });

      const onTimeRate = completed.length > 0
        ? Math.round((onTime.length / completed.length) * 100)
        : 100;

      const approvalRate = completed.length > 0
        ? Math.round((approved.length / completed.length) * 100)
        : 0;

      // Total earned
      const { data: payouts } = await supabase
        .from("scout_payouts")
        .select("amount, status, currency")
        .eq("scout_id", scoutId)
        .eq("status", "paid");

      const totalEarned = (payouts ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      const currency = payouts?.[0]?.currency ?? "RON";

      return {
        jobsCompleted: completed.length,
        onTimeRate,
        approvalRate,
        totalEarned,
        currency,
      };
    },
    enabled: !!scoutId,
  });
}

export function useScoutMonthlyEarnings() {
  const { scoutId } = useScoutAuth();

  return useQuery({
    queryKey: ["scout-performance-monthly", scoutId],
    queryFn: async (): Promise<MonthlyEarning[]> => {
      if (!scoutId) return [];

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: payouts } = await supabase
        .from("scout_payouts")
        .select("amount, paid_at")
        .eq("scout_id", scoutId)
        .eq("status", "paid")
        .gte("paid_at", sixMonthsAgo.toISOString());

      const months: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
        months[key] = 0;
      }

      (payouts ?? []).forEach(p => {
        if (!p.paid_at) return;
        const d = new Date(p.paid_at);
        const key = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
        if (key in months) months[key] += p.amount ?? 0;
      });

      return Object.entries(months).map(([month, amount]) => ({ month, amount }));
    },
    enabled: !!scoutId,
  });
}

export function useScoutJobHistory() {
  const { scoutId } = useScoutAuth();

  return useQuery({
    queryKey: ["scout-performance-history", scoutId],
    queryFn: async (): Promise<JobHistoryItem[]> => {
      if (!scoutId) return [];

      const { data } = await supabase
        .from("scout_jobs")
        .select("id, title, status, approved_at, created_at")
        .eq("assigned_scout_id", scoutId)
        .order("created_at", { ascending: false })
        .limit(20);

      return (data ?? []).map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        approved_at: j.approved_at,
        created_at: j.created_at ?? new Date().toISOString(),
      }));
    },
    enabled: !!scoutId,
  });
}
