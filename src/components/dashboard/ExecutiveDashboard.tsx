import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Landmark } from "lucide-react";
import { DashboardGreeting } from "./DashboardGreeting";
import { DepartmentHealthGrid } from "./DepartmentHealthGrid";
import { CrossModuleStatsRow } from "./CrossModuleStatsRow";
import { PendingApprovalsWidget } from "./PendingApprovalsWidget";
import { TasksWidget } from "./TasksWidget";
import { OpenCorrectiveActionsWidget } from "./OpenCorrectiveActionsWidget";
import { ActivityFeedWidget } from "./ActivityFeedWidget";
import { AttentionAlertBar } from "./AttentionAlertBar";
import { DraftAudits } from "./DraftAudits";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { subWeeks } from "date-fns";
import { useLabels } from "@/hooks/useLabels";
import { useTranslation } from "react-i18next";

export const ExecutiveDashboard = () => {
  const { t } = useTranslation();
  const { label } = useLabels();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subWeeks(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Executive Overview
          </h2>
          <p className="text-muted-foreground">
            {label("company", "Institution")} performance at a glance
          </p>
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
          <Badge variant="default" className="text-sm">
            {label("owner", "Mayor")}
          </Badge>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* Greeting */}
      <DashboardGreeting />

      {/* Draft Audits */}
      <DraftAudits />

      {/* Attention Alerts */}
      <AttentionAlertBar dateFrom={dateFrom} dateTo={dateTo} />

      {/* Department Health Grid — government-specific */}
      <DepartmentHealthGrid />

      {/* Cross-Module KPIs */}
      <CrossModuleStatsRow dateFrom={dateFrom} dateTo={dateTo} />

      {/* Approvals + Activity side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingApprovalsWidget />
        <ActivityFeedWidget />
      </div>

      {/* Tasks + CAs side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TasksWidget />
        <OpenCorrectiveActionsWidget />
      </div>
    </div>
  );
};
