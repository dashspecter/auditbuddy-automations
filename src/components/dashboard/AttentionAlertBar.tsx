import { AlertTriangle, ClipboardCheck, ListTodo, Wrench, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTaskStats } from "@/hooks/useTasks";
import { useCorrectiveActions } from "@/hooks/useCorrectiveActions";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { format, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";

interface AttentionAlertBarProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const AttentionAlertBar = ({ dateFrom, dateTo }: AttentionAlertBarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    { count: overdueAudits, label: t("dashboard.attention.overdueAudits", "Overdue Audits"), icon: ClipboardCheck, path: "/audits", color: "bg-destructive/10 text-destructive border-destructive/20" },
    { count: overdueTasks, label: t("dashboard.attention.overdueTasks", "Overdue Tasks"), icon: ListTodo, path: "/tasks", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400" },
    { count: openCAs, label: t("dashboard.attention.openCAs", "Open CAs"), icon: Shield, path: "/corrective-actions", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400" },
    { count: overdueInterventions, label: t("dashboard.attention.overdueMaintenance", "Overdue Maintenance"), icon: Wrench, path: "/maintenance", color: "bg-warning/15 text-warning border-warning/30" },
    { count: atRiskEmployees, label: t("dashboard.attention.atRiskEmployees", "At-Risk Employees"), icon: Users, path: "/workforce", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  ].filter(item => item.count > 0);

  if (items.length === 0) return null;

  return (
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
          onClick={() => navigate(item.path)}
        >
          <item.icon className="h-3 w-3" />
          <span className="font-bold">{item.count}</span>
          <span>{item.label}</span>
        </Badge>
      ))}
    </div>
  );
};
