import { AlertTriangle, ClipboardCheck, ListTodo, Wrench, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTaskStats } from "@/hooks/useTasks";
import { useCorrectiveActions } from "@/hooks/useCorrectiveActions";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { format, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { DashboardPreviewDialog } from "./DashboardPreviewDialog";
import { AuditScorePopup } from "./popups/AuditScorePopup";
import { TaskCompletionPopup } from "./popups/TaskCompletionPopup";
import { OpenCAsPopup } from "./popups/OpenCAsPopup";
import { WorkforceScorePopup } from "./popups/WorkforceScorePopup";

type AlertType = "audits" | "tasks" | "cas" | "maintenance" | "workforce" | null;

interface AttentionAlertBarProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const AttentionAlertBar = ({ dateFrom, dateTo }: AttentionAlertBarProps) => {
  const { t } = useTranslation();
  const [activeAlert, setActiveAlert] = useState<AlertType>(null);

  const dashboardStats = useDashboardStats({ dateFrom, dateTo });
  const { data: taskStats } = useTaskStats();
  const { data: cas } = useCorrectiveActions();
  const { data: interventions } = useEquipmentInterventions();

  const now = new Date();
  const startDate = format(subMonths(now, 1), "yyyy-MM-dd");
  const endDate = format(now, "yyyy-MM-dd");
  const { allScores } = usePerformanceLeaderboard(startDate, endDate);

  const overdueAudits = dashboardStats.overdueAudits || 0;
  const overdueTasks = taskStats?.overdue || 0;
  const openCAs = cas?.filter(ca => ca.status === "open" || ca.status === "in_progress").length || 0;
  const overdueInterventions = interventions?.filter(i => i.status === "overdue").length || 0;
  const atRiskEmployees = allScores?.filter(e => e.overall_score < 50).length || 0;

  const items = [
    { count: overdueAudits, label: t("dashboard.attention.overdueAudits", "Overdue Audits"), icon: ClipboardCheck, alertType: "audits", color: "bg-destructive/10 text-destructive border-destructive/20" },
    { count: overdueTasks, label: t("dashboard.attention.overdueTasks", "Overdue Tasks"), icon: ListTodo, alertType: "tasks", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400" },
    { count: openCAs, label: t("dashboard.attention.openCAs", "Open CAs"), icon: Shield, alertType: "cas", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400" },
    { count: overdueInterventions, label: t("dashboard.attention.overdueMaintenance", "Overdue Maintenance"), icon: Wrench, alertType: "maintenance", color: "bg-warning/15 text-warning border-warning/30" },
    { count: atRiskEmployees, label: t("dashboard.attention.atRiskEmployees", "At-Risk Employees"), icon: Users, alertType: "workforce", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  ].filter(item => item.count > 0);

  if (items.length === 0) return null;

  const alertConfig: Record<Exclude<AlertType, null>, { title: string; navigateTo: string; navigateLabel: string }> = {
    audits: { title: t("dashboard.attention.overdueAudits", "Overdue Audits"), navigateTo: "/audits", navigateLabel: t("dashboard.popup.goToAudits", "Go to Audits") },
    tasks: { title: t("dashboard.attention.overdueTasks", "Overdue Tasks"), navigateTo: "/tasks", navigateLabel: t("dashboard.popup.goToTasks", "Go to Tasks") },
    cas: { title: t("dashboard.attention.openCAs", "Open CAs"), navigateTo: "/corrective-actions", navigateLabel: t("dashboard.popup.goToCAs", "Go to Corrective Actions") },
    maintenance: { title: t("dashboard.attention.overdueMaintenance", "Overdue Maintenance"), navigateTo: "/maintenance", navigateLabel: t("dashboard.popup.goToMaintenance", "Go to Maintenance") },
    workforce: { title: t("dashboard.attention.atRiskEmployees", "At-Risk Employees"), navigateTo: "/workforce", navigateLabel: t("dashboard.popup.goToWorkforce", "Go to Workforce") },
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-1.5 mr-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">
            {t("dashboard.attention.title", "Needs Attention")}
          </span>
        </div>
        {items.map((item) => (
          <Badge
            key={item.label}
            variant="outline"
            className={`cursor-pointer hover:opacity-80 transition-opacity gap-1.5 ${item.color}`}
            onClick={() => setActiveAlert(item.alertType as AlertType)}
          >
            <item.icon className="h-3 w-3" />
            <span className="font-bold">{item.count}</span>
            <span>{item.label}</span>
          </Badge>
        ))}
      </div>

      {activeAlert && (
        <DashboardPreviewDialog
          open={!!activeAlert}
          onOpenChange={(open) => !open && setActiveAlert(null)}
          title={alertConfig[activeAlert].title}
          navigateTo={alertConfig[activeAlert].navigateTo}
          navigateLabel={alertConfig[activeAlert].navigateLabel}
        >
          {activeAlert === "audits" && <AuditScorePopup dateFrom={dateFrom} dateTo={dateTo} />}
          {activeAlert === "tasks" && <TaskCompletionPopup />}
          {activeAlert === "cas" && <OpenCAsPopup />}
          {activeAlert === "maintenance" && (
            <div className="text-center p-4">
              <p className="text-lg font-bold text-warning">{overdueInterventions}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.popup.overdueMaintenanceItems", "overdue maintenance items")}</p>
            </div>
          )}
          {activeAlert === "workforce" && <WorkforceScorePopup dateFrom={dateFrom} dateTo={dateTo} />}
        </DashboardPreviewDialog>
      )}
    </>
  );
};
