import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { ArrowLeft, BarChart3, Users, Zap, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DashUsageStats } from "@/components/dash/DashUsageStats";
import { format, subDays } from "date-fns";

interface AnalyticsData {
  totalSessions: number;
  totalActions: number;
  toolBreakdown: { name: string; count: number }[];
  successCount: number;
  failureCount: number;
  writeActions: number;
  readActions: number;
  moduleBreakdown: { module: string; count: number }[];
  topUsers: { userId: string; count: number }[];
}

export default function DashAnalytics() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const since = subDays(new Date(), 30).toISOString();

      const [sessionsRes, actionsRes] = await Promise.all([
        supabase
          .from("dash_sessions")
          .select("id, user_id")
          .eq("company_id", company.id)
          .gte("created_at", since),
        supabase
          .from("dash_action_log")
          .select("action_name, action_type, status, modules_touched, user_id")
          .eq("company_id", company.id)
          .gte("created_at", since)
          .limit(1000),
      ]);

      if (cancelled) return;

      const sessions = sessionsRes.data ?? [];
      const actions = actionsRes.data ?? [];

      // Tool breakdown
      const toolMap = new Map<string, number>();
      actions.forEach((a: any) => {
        const name = a.action_name || "chat_response";
        toolMap.set(name, (toolMap.get(name) || 0) + 1);
      });
      const toolBreakdown = Array.from(toolMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Module breakdown
      const moduleMap = new Map<string, number>();
      actions.forEach((a: any) => {
        const modules = a.modules_touched as string[] | null;
        (modules ?? []).forEach((m: string) => {
          moduleMap.set(m, (moduleMap.get(m) || 0) + 1);
        });
      });
      const moduleBreakdown = Array.from(moduleMap.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count);

      // Top users
      const userMap = new Map<string, number>();
      sessions.forEach((s: any) => {
        userMap.set(s.user_id, (userMap.get(s.user_id) || 0) + 1);
      });
      const topUsers = Array.from(userMap.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setData({
        totalSessions: sessions.length,
        totalActions: actions.length,
        toolBreakdown,
        successCount: actions.filter((a: any) => a.status === "success").length,
        failureCount: actions.filter((a: any) => a.status === "error").length,
        writeActions: actions.filter((a: any) => a.action_type === "write").length,
        readActions: actions.filter((a: any) => a.action_type === "read").length,
        moduleBreakdown,
        topUsers,
      });
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [company?.id]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dash")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Dash Analytics</h1>
          <p className="text-xs text-muted-foreground">Last 30 days of Dash usage</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <DashUsageStats
            stats={[
              { label: "Total Sessions", value: data.totalSessions, icon: Activity },
              { label: "Total Actions", value: data.totalActions, icon: Zap },
              { label: "Write Actions", value: data.writeActions, icon: Shield },
              { label: "Unique Users", value: data.topUsers.length, icon: Users },
            ]}
          />

          {/* Success/Failure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {data.totalActions > 0
                  ? `${Math.round((data.successCount / data.totalActions) * 100)}%`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.successCount} success / {data.failureCount} failures
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Read vs Write</p>
              <p className="text-2xl font-bold text-foreground">{data.readActions} / {data.writeActions}</p>
              <p className="text-xs text-muted-foreground">read / write actions</p>
            </div>
          </div>

          {/* Tool Breakdown */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Top Tools Used</p>
            </div>
            <div className="space-y-2">
              {data.toolBreakdown.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80 font-mono text-xs truncate max-w-[200px]">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((t.count / (data.toolBreakdown[0]?.count || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{t.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Module Usage</p>
            <div className="flex flex-wrap gap-2">
              {data.moduleBreakdown.map((m) => (
                <span key={m.module} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  {m.module}: {m.count}
                </span>
              ))}
            </div>
          </div>

          {/* Top Users */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Top Users by Sessions</p>
            <div className="space-y-1.5">
              {data.topUsers.map((u, i) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                    {i + 1}. {u.userId.substring(0, 8)}...
                  </span>
                  <span className="text-xs font-medium text-foreground">{u.count} sessions</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
