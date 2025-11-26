import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ClipboardCheck, RefreshCw } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { RecentAudits } from "./RecentAudits";
import { ComplianceChart } from "./ComplianceChart";
import { CompliancePieChart } from "./CompliancePieChart";
import { DraftAudits } from "./DraftAudits";
import { DashboardGreeting } from "./DashboardGreeting";
import { LocationTrendAnalysis } from "./LocationTrendAnalysis";
import { SectionPerformanceTrends } from "./SectionPerformanceTrends";
import { LocationPerformanceCards } from "./LocationPerformanceCards";
import { useLocationAudits } from "@/hooks/useAudits";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const AdminDashboard = () => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const dashboardStats = useDashboardStats();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: usersCount } = useQuery({
    queryKey: ['users_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: notificationsCount } = useQuery({
    queryKey: ['active_notifications_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['location_audits'] }),
        queryClient.invalidateQueries({ queryKey: ['users_count'] }),
        queryClient.invalidateQueries({ queryKey: ['active_notifications_count'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      toast.success("Dashboard data refreshed");
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    if (!audits) return { totalAudits: 0, locations: 0, complianceRate: 0 };

    const totalAudits = audits.length;
    const locations = new Set(audits.map(a => a.location)).size;
    const compliant = audits.filter(a => (a.overall_score || 0) >= 80).length;
    const complianceRate = totalAudits > 0 ? Math.round((compliant / totalAudits) * 100) : 0;

    return { totalAudits, locations, complianceRate };
  }, [audits]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">System-wide overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Badge variant="default" className="text-sm">Administrator</Badge>
        </div>
      </div>

      <DashboardGreeting />

      <DraftAudits />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard
          title="Completed"
          value={dashboardStats.isLoading ? "..." : dashboardStats.completedAudits.toString()}
          icon={ClipboardCheck}
          description="Finished audits"
        />
        <StatsCard
          title="Overdue"
          value={dashboardStats.isLoading ? "..." : dashboardStats.overdueAudits.toString()}
          icon={ClipboardCheck}
          description="Past deadline"
        />
        <StatsCard
          title="Average Score"
          value={dashboardStats.isLoading ? "..." : `${dashboardStats.avgScore}%`}
          icon={TrendingUp}
          description="Overall average"
        />
        <StatsCard
          title="Worst Location"
          value={dashboardStats.isLoading ? "..." : `${dashboardStats.worstLocation.score}%`}
          icon={TrendingDown}
          description={dashboardStats.worstLocation.name}
        />
        <StatsCard
          title="Best Location"
          value={dashboardStats.isLoading ? "..." : `${dashboardStats.bestLocation.score}%`}
          icon={TrendingUp}
          description={dashboardStats.bestLocation.name}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompliancePieChart />
        <RecentAudits />
      </div>

      <div className="w-full">
        <ComplianceChart />
      </div>

      <div className="w-full">
        <LocationTrendAnalysis />
      </div>

      <div className="w-full">
        <SectionPerformanceTrends />
      </div>

      <div className="w-full">
        <LocationPerformanceCards />
      </div>
    </div>
  );
};
