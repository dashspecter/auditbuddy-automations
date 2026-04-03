import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DashboardGreeting } from "./DashboardGreeting";
import { MaintenanceInterventions } from "./MaintenanceInterventions";
import { CompanySetupChecklist } from "./CompanySetupChecklist";
import { AttentionAlertBar } from "./AttentionAlertBar";
import { CrossModuleStatsRow } from "./CrossModuleStatsRow";
import { DecliningLocationsCard } from "./DecliningLocationsCard";
import { WeakestSectionsCard } from "./WeakestSectionsCard";
import { OpenCorrectiveActionsWidget } from "./OpenCorrectiveActionsWidget";
import { TasksWidget } from "./TasksWidget";
import { WorkforceAnalytics } from "./WorkforceAnalytics";
import { DraftAudits } from "./DraftAudits";
import { YesterdayResultsRow } from "./YesterdayResultsRow";
import { TodaySnapshotRow } from "./TodaySnapshotRow";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { subWeeks } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCompanyIndustry } from "@/hooks/useCompanyIndustry";
import { ExecutiveDashboard } from "./ExecutiveDashboard";

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const { data: industry } = useCompanyIndustry();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const now = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => subWeeks(now, 1), [now]);

  // Government companies get the Executive (Mayor) Dashboard
  if (industry?.slug === "government") {
    return <ExecutiveDashboard />;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
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
      {/* Header */}
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

      {/* Greeting */}
      <DashboardGreeting />

      {/* Draft Audits Reminder */}
      <DraftAudits />

      {/* Company Setup Checklist */}
      <CompanySetupChecklist />

      {/* Attention Alert Bar */}
      <AttentionAlertBar dateFrom={sevenDaysAgo} dateTo={now} />

      {/* Yesterday's Results */}
      <YesterdayResultsRow />

      {/* Today */}
      <TodaySnapshotRow />

      {/* Past 7 Days */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">
          {t("dashboard.past7Days", "Past 7 Days")}
        </h3>
        <CrossModuleStatsRow dateFrom={sevenDaysAgo} dateTo={now} />
      </div>

      {/* Declining Locations + Weakest Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DecliningLocationsCard dateFrom={sevenDaysAgo} dateTo={now} />
        <WeakestSectionsCard dateFrom={sevenDaysAgo} dateTo={now} />
      </div>

      {/* Workforce Health Summary (without top 5 cards) */}
      <WorkforceAnalytics period="month" showDateFilter={false} showTopCards={false} />

      {/* Tasks + Corrective Actions Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TasksWidget />
        <OpenCorrectiveActionsWidget />
      </div>

      {/* Maintenance Schedule */}
      <MaintenanceInterventions />
    </div>
  );
};
