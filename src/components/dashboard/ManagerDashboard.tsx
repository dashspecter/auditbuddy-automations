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
import { TasksWidget } from "./TasksWidget";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useLocationAudits } from "@/hooks/useAudits";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { subMonths } from "date-fns";
import { useTranslation } from "react-i18next";

export const ManagerDashboard = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const dashboardStats = useDashboardStats({ dateFrom, dateTo });
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
      toast.success(t('dashboard.dataRefreshed'));
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error(t('dashboard.failedRefresh'));
    } finally {
      setIsRefreshing(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.manager.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.manager.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? t('common.refreshing') : t('common.refresh')}
          </Button>
          <Badge variant="secondary" className="text-sm">{t('dashboard.manager.badge')}</Badge>
        </div>
      </div>

      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <DashboardGreeting />

      <DraftAudits />

      {(pendingAudits?.length || 0) > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <h3 className="font-semibold">{t('dashboard.manager.pendingReviews')}</h3>
              <p className="text-sm text-muted-foreground">
                {pendingAudits?.length} {(pendingAudits?.length || 0) !== 1 ? t('dashboard.manager.auditsWaiting_plural', { count: pendingAudits?.length }) : t('dashboard.manager.auditsWaiting', { count: pendingAudits?.length })}
              </p>
            </div>
            <Link to="/audits?status=pending">
              <Button variant="outline" size="sm">{t('dashboard.manager.review')}</Button>
            </Link>
          </div>
        </Card>
      )}

      {isMobile ? (
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {t('dashboard.stats.statisticsOverview')}
              <ChevronDown className={`h-4 w-4 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid gap-4">
              <RecentAudits />
              <StatsCard
                title={t('dashboard.stats.completed')}
                value={dashboardStats.isLoading ? "..." : dashboardStats.completedAudits.toString()}
                icon={ClipboardCheck}
                description={t('dashboard.stats.finishedAudits')}
              />
              <StatsCard
                title={t('dashboard.stats.overdue')}
                value={dashboardStats.isLoading ? "..." : dashboardStats.overdueAudits.toString()}
                icon={ClipboardCheck}
                description={t('dashboard.stats.pastDeadline')}
              />
              <StatsCard
                title={t('dashboard.stats.averageScore')}
                value={dashboardStats.isLoading ? "..." : `${dashboardStats.avgScore}%`}
                icon={TrendingUp}
                description={t('dashboard.stats.overallAverage')}
              />
              <StatsCard
                title={t('dashboard.stats.worstLocation')}
                value={dashboardStats.isLoading ? "..." : `${dashboardStats.worstLocation.score}%`}
                icon={TrendingDown}
                description={dashboardStats.worstLocation.name}
              />
              <StatsCard
                title={t('dashboard.stats.bestLocation')}
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
            title={t('dashboard.stats.completed')}
            value={dashboardStats.isLoading ? "..." : dashboardStats.completedAudits.toString()}
            icon={ClipboardCheck}
            description={t('dashboard.stats.finishedAudits')}
          />
          <StatsCard
            title={t('dashboard.stats.overdue')}
            value={dashboardStats.isLoading ? "..." : dashboardStats.overdueAudits.toString()}
            icon={ClipboardCheck}
            description={t('dashboard.stats.pastDeadline')}
          />
          <StatsCard
            title={t('dashboard.stats.averageScore')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.avgScore}%`}
            icon={TrendingUp}
            description={t('dashboard.stats.overallAverage')}
          />
          <StatsCard
            title={t('dashboard.stats.worstLocation')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.worstLocation.score}%`}
            icon={TrendingDown}
            description={dashboardStats.worstLocation.name}
          />
          <StatsCard
            title={t('dashboard.stats.bestLocation')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.bestLocation.score}%`}
            icon={TrendingUp}
            description={dashboardStats.bestLocation.name}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CompliancePieChart dateFrom={dateFrom} dateTo={dateTo} />
        <LocationPerformanceChart dateFrom={dateFrom} dateTo={dateTo} />
      </div>

      <div className="w-full">
        <LocationTrendAnalysis />
      </div>

      <div className="w-full">
        <SectionPerformanceTrends />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MaintenanceInterventions />
        <TasksWidget />
      </div>
    </div>
  );
};
