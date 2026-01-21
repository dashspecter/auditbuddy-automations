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
import { StatsDetailDialog, StatsDialogType } from "./StatsDetailDialog";
import { useLocationAudits } from "@/hooks/useAudits";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { subWeeks, startOfDay, endOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subWeeks(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const dashboardStats = useDashboardStats({ dateFrom, dateTo });
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<StatsDialogType>("completed");
  
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

  // Filter audits by date range
  const filteredAudits = useMemo(() => {
    if (!audits) return [];
    return audits.filter(audit => {
      const auditDate = new Date(audit.audit_date);
      if (dateFrom && auditDate < startOfDay(dateFrom)) return false;
      if (dateTo && auditDate > endOfDay(dateTo)) return false;
      return true;
    });
  }, [audits, dateFrom, dateTo]);

  // Prepare dialog data
  const dialogData = useMemo(() => {
    const completedAudits = filteredAudits
      .filter(a => a.status === 'compliant')
      .map(a => ({
        id: a.id,
        location: a.locations?.name || a.location || 'Unknown',
        audit_date: a.audit_date,
        overall_score: a.overall_score,
        status: a.status || '',
      }));

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueAudits = filteredAudits
      .filter(a => {
        if (a.status === 'compliant') return false;
        const auditDate = new Date(a.audit_date);
        auditDate.setHours(0, 0, 0, 0);
        return auditDate < now && (a.status === 'pending' || a.status === 'draft');
      })
      .map(a => ({
        id: a.id,
        location: a.locations?.name || a.location || 'Unknown',
        audit_date: a.audit_date,
        overall_score: a.overall_score,
        status: a.status || '',
      }));

    const allAuditsForScore = filteredAudits
      .filter(a => a.overall_score && a.overall_score > 0) // Exclude 0% audits
      .map(a => ({
        id: a.id,
        location: a.locations?.name || a.location || 'Unknown',
        audit_date: a.audit_date,
        overall_score: a.overall_score,
        status: a.status || '',
      }))
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));

    // Location rankings
    const locationScores = new Map<string, { total: number; count: number; name: string }>();
    filteredAudits.forEach(audit => {
      const locationName = audit.locations?.name || audit.location || 'Unknown';
      const locationId = audit.location_id || locationName;
      
      if (!locationScores.has(locationId)) {
        locationScores.set(locationId, { total: 0, count: 0, name: locationName });
      }
      
      const loc = locationScores.get(locationId)!;
      loc.total += audit.overall_score || 0;
      loc.count += 1;
    });

    const locationRankings = Array.from(locationScores.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
        auditCount: data.count,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const worstLocations = locationRankings.slice(0, 10);
    const bestLocations = [...locationRankings].reverse().slice(0, 10);

    return { completedAudits, overdueAudits, allAuditsForScore, worstLocations, bestLocations };
  }, [filteredAudits]);

  const handleCardClick = (type: StatsDialogType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const getDialogTitle = () => {
    switch (dialogType) {
      case "completed": return t('dashboard.stats.completedAudits');
      case "overdue": return t('dashboard.stats.overdueAudits');
      case "averageScore": return t('dashboard.stats.allAuditScores');
      case "worstLocation": return t('dashboard.stats.lowestPerformingLocations');
      case "bestLocation": return t('dashboard.stats.topPerformingLocations');
      default: return "";
    }
  };

  const getDialogAudits = () => {
    switch (dialogType) {
      case "completed": return dialogData.completedAudits;
      case "overdue": return dialogData.overdueAudits;
      case "averageScore": return dialogData.allAuditsForScore;
      default: return [];
    }
  };

  const getDialogLocations = () => {
    switch (dialogType) {
      case "worstLocation": return dialogData.worstLocations;
      case "bestLocation": return dialogData.bestLocations;
      default: return [];
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
                onClick={() => handleCardClick("completed")}
              />
              <StatsCard
                title={t('dashboard.stats.overdue')}
                value={dashboardStats.isLoading ? "..." : dashboardStats.overdueAudits.toString()}
                icon={ClipboardCheck}
                description={t('dashboard.stats.pastDeadline')}
                onClick={() => handleCardClick("overdue")}
              />
              <StatsCard
                title={t('dashboard.stats.averageScore')}
                value={dashboardStats.isLoading ? "..." : `${dashboardStats.avgScore}%`}
                icon={TrendingUp}
                description={t('dashboard.stats.overallAverage')}
                onClick={() => handleCardClick("averageScore")}
              />
              <StatsCard
                title={t('dashboard.stats.worstLocation')}
                value={dashboardStats.isLoading ? "..." : `${dashboardStats.worstLocation.score}%`}
                icon={TrendingDown}
                description={dashboardStats.worstLocation.name}
                onClick={() => handleCardClick("worstLocation")}
              />
              <StatsCard
                title={t('dashboard.stats.bestLocation')}
                value={dashboardStats.isLoading ? "..." : `${dashboardStats.bestLocation.score}%`}
                icon={TrendingUp}
                description={dashboardStats.bestLocation.name}
                onClick={() => handleCardClick("bestLocation")}
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
            onClick={() => handleCardClick("completed")}
          />
          <StatsCard
            title={t('dashboard.stats.overdue')}
            value={dashboardStats.isLoading ? "..." : dashboardStats.overdueAudits.toString()}
            icon={ClipboardCheck}
            description={t('dashboard.stats.pastDeadline')}
            onClick={() => handleCardClick("overdue")}
          />
          <StatsCard
            title={t('dashboard.stats.averageScore')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.avgScore}%`}
            icon={TrendingUp}
            description={t('dashboard.stats.overallAverage')}
            onClick={() => handleCardClick("averageScore")}
          />
          <StatsCard
            title={t('dashboard.stats.worstLocation')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.worstLocation.score}%`}
            icon={TrendingDown}
            description={dashboardStats.worstLocation.name}
            onClick={() => handleCardClick("worstLocation")}
          />
          <StatsCard
            title={t('dashboard.stats.bestLocation')}
            value={dashboardStats.isLoading ? "..." : `${dashboardStats.bestLocation.score}%`}
            icon={TrendingUp}
            description={dashboardStats.bestLocation.name}
            onClick={() => handleCardClick("bestLocation")}
          />
        </div>
      )}

      <StatsDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        audits={getDialogAudits()}
        locations={getDialogLocations()}
        title={getDialogTitle()}
      />

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

      <MaintenanceInterventions />
    </div>
  );
};
