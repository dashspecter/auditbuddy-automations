import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DashboardGreeting } from "./DashboardGreeting";
import { MaintenanceInterventions } from "./MaintenanceInterventions";
import { AttentionAlertBar } from "./AttentionAlertBar";
import { CrossModuleStatsRow } from "./CrossModuleStatsRow";
import { DecliningLocationsCard } from "./DecliningLocationsCard";
import { WeakestSectionsCard } from "./WeakestSectionsCard";
import { OpenCorrectiveActionsWidget } from "./OpenCorrectiveActionsWidget";
import { WhatsAppStatsWidget } from "./WhatsAppStatsWidget";
import { TasksWidget } from "./TasksWidget";
import { WorkforceAnalytics } from "./WorkforceAnalytics";
import { DraftAudits } from "./DraftAudits";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { subWeeks } from "date-fns";
import { useTranslation } from "react-i18next";

export const AdminDashboard = () => {
  const { t } = useTranslation();
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

      {/* Date Filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* Greeting */}
      <DashboardGreeting />

      {/* Draft Audits Reminder */}
      <DraftAudits />

      {/* 1. Attention Alert Bar */}
      <AttentionAlertBar dateFrom={dateFrom} dateTo={dateTo} />

      {/* 2. Cross-Module KPI Stats */}
      <CrossModuleStatsRow dateFrom={dateFrom} dateTo={dateTo} />

      {/* 3. Declining Locations + Weakest Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DecliningLocationsCard dateFrom={dateFrom} dateTo={dateTo} />
        <WeakestSectionsCard dateFrom={dateFrom} dateTo={dateTo} />
      </div>

      {/* 4. Workforce Health Summary */}
      <WorkforceAnalytics period="month" showDateFilter={false} />

      {/* 5. Tasks + Corrective Actions Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TasksWidget />
        <OpenCorrectiveActionsWidget />
      </div>

      {/* 6. WhatsApp Stats */}
      <WhatsAppStatsWidget />

      {/* 7. Maintenance Schedule */}
      <MaintenanceInterventions />
    </div>
  );
};
