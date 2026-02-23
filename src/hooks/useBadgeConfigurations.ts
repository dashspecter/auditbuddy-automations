import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface BadgeConfigRow {
  id: string;
  company_id: string;
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rule_type: string;
  threshold: number;
  streak_months: number | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

const SYSTEM_DEFAULTS: Omit<BadgeConfigRow, "id" | "company_id" | "created_at">[] = [
  { badge_key: "perfect_attendance", name: "Perfect Attendance", description: "100% attendance score this month", icon: "CheckCircle2", color: "text-green-600 dark:text-green-400", rule_type: "attendance_min", threshold: 100, streak_months: null, is_active: true, is_system: true, sort_order: 0 },
  { badge_key: "always_on_time", name: "Always On Time", description: "100% punctuality score this month", icon: "Clock", color: "text-blue-600 dark:text-blue-400", rule_type: "punctuality_min", threshold: 100, streak_months: null, is_active: true, is_system: true, sort_order: 1 },
  { badge_key: "task_champion", name: "Task Champion", description: "100% task completion score this month", icon: "ListTodo", color: "text-purple-600 dark:text-purple-400", rule_type: "task_min", threshold: 100, streak_months: null, is_active: true, is_system: true, sort_order: 2 },
  { badge_key: "top_3", name: "Top 3 Finish", description: "Ranked in top 3 at your location", icon: "Trophy", color: "text-yellow-600 dark:text-yellow-400", rule_type: "rank_max", threshold: 3, streak_months: null, is_active: true, is_system: true, sort_order: 3 },
  { badge_key: "rising_star", name: "Rising Star", description: "Score improved 10+ points from last month", icon: "TrendingUp", color: "text-emerald-600 dark:text-emerald-400", rule_type: "score_improvement", threshold: 10, streak_months: null, is_active: true, is_system: true, sort_order: 4 },
  { badge_key: "consistency_streak", name: "Consistency Streak", description: "Score above 80 for 3+ consecutive months", icon: "Flame", color: "text-orange-600 dark:text-orange-400", rule_type: "streak_min", threshold: 80, streak_months: 3, is_active: true, is_system: true, sort_order: 5 },
];

function useCompanyId() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => setCompanyId(data?.company_id || null));
  }, [user]);

  return companyId;
}

export function useBadgeConfigurations() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["badge-configurations", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch existing configs
      const { data, error } = await supabase
        .from("badge_configurations")
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");

      if (error) throw error;

      // If no configs exist, seed system defaults
      if (!data || data.length === 0) {
        const seedRows = SYSTEM_DEFAULTS.map((d) => ({
          ...d,
          company_id: companyId,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("badge_configurations")
          .insert(seedRows)
          .select("*");

        if (insertError) throw insertError;
        return (inserted || []) as BadgeConfigRow[];
      }

      return data as BadgeConfigRow[];
    },
    enabled: !!companyId,
  });

  const updateBadge = useMutation({
    mutationFn: async (update: Partial<BadgeConfigRow> & { id: string }) => {
      const { id, ...fields } = update;
      const { error } = await supabase
        .from("badge_configurations")
        .update(fields)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge-configurations", companyId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createBadge = useMutation({
    mutationFn: async (badge: Omit<BadgeConfigRow, "id" | "created_at">) => {
      const { error } = await supabase
        .from("badge_configurations")
        .insert(badge);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge-configurations", companyId] });
      toast.success("Badge created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("badge_configurations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge-configurations", companyId] });
      toast.success("Badge deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    configs: query.data || [],
    isLoading: query.isLoading,
    companyId,
    updateBadge,
    createBadge,
    deleteBadge,
  };
}
