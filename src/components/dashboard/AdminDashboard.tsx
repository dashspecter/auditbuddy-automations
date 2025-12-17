import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ClipboardCheck, RefreshCw, ChevronDown } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { RecentAudits } from "./RecentAudits";
import { CompliancePieChart } from "./CompliancePieChart";
import { DraftAudits } from "./DraftAudits";
import { DashboardGreeting } from "./DashboardGreeting";
import { LocationTrendAnalysis } from "./LocationTrendAnalysis";
import { SectionPerformanceTrends } from "./SectionPerformanceTrends";
import { LocationPerformanceChart } from "./LocationPerformanceChart";
import { MaintenanceInterventions } from "./MaintenanceInterventions";
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

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const dashboardStats = useDashboardStats({ dateFrom, dateTo });
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const isMobile = useIsMobile();
  
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
      toast.success(t('dashboard.dataRefreshed'));
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error(t('dashboard.failedRefresh'));
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
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.admin.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.admin.subtitle')}</p>
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
          <Badge variant="default" className="text-sm">{t('dashboard.admin.badge')}</Badge>
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
