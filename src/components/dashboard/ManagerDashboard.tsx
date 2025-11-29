import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, ClipboardCheck, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { RecentAudits } from "./RecentAudits";
import { CompliancePieChart } from "./CompliancePieChart";
import { DraftAudits } from "./DraftAudits";
import { DashboardGreeting } from "./DashboardGreeting";
import { LocationTrendAnalysis } from "./LocationTrendAnalysis";
import { SectionPerformanceTrends } from "./SectionPerformanceTrends";
import { LocationPerformanceChart } from "./LocationPerformanceChart";
import { MaintenanceInterventions } from "./MaintenanceInterventions";
import { useLocationAudits } from "@/hooks/useAudits";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

export const ManagerDashboard = () => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const dashboardStats = useDashboardStats();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const { data: checkersCount } = useQuery({
    queryKey: ['checkers_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'checker');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingAudits } = useQuery({
    queryKey: ['pending_audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['location_audits'] }),
        queryClient.invalidateQueries({ queryKey: ['checkers_count'] }),
        queryClient.invalidateQueries({ queryKey: ['pending_audits'] }),
      ]);
      toast.success("Dashboard data refreshed");
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manager Dashboard</h2>
          <p className="text-muted-foreground">Team oversight and location management</p>
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
          <Badge variant="secondary" className="text-sm">Manager</Badge>
        </div>
      </div>

      <DashboardGreeting />

      <DraftAudits />

      {(pendingAudits?.length || 0) > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <h3 className="font-semibold">Pending Reviews</h3>
              <p className="text-sm text-muted-foreground">
                {pendingAudits?.length} audit{(pendingAudits?.length || 0) !== 1 ? 's' : ''} waiting for review
              </p>
            </div>
            <Link to="/audits?status=pending">
              <Button variant="outline" size="sm">Review</Button>
            </Link>
          </div>
        </Card>
      )}

      {isMobile ? (
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Statistics Overview
              <ChevronDown className={`h-4 w-4 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid gap-4">
              <RecentAudits />
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
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <RecentAudits />
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
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CompliancePieChart />
        <LocationPerformanceChart />
      </div>

      <div className="w-full">
        <LocationTrendAnalysis />
      </div>

      <div className="w-full">
        <SectionPerformanceTrends />
      </div>

      <MaintenanceInterventions />
    </div>
  );
};
