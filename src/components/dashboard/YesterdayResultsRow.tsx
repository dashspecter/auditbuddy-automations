import { useMemo } from "react";
import { TrendingUp, ListTodo, Users, Shield, Clock } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTaskStats } from "@/hooks/useTasks";
import { useCorrectiveActions } from "@/hooks/useCorrectiveActions";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { useMvAttendanceStats } from "@/hooks/useMaterializedViews";
import { subDays, format, startOfDay } from "date-fns";
import { CA_OPEN_STATUSES } from "@/lib/constants";
import { useTranslation } from "react-i18next";

export const YesterdayResultsRow = () => {
  const { t } = useTranslation();
  const yesterday = useMemo(() => subDays(new Date(), 1), []);
  const yesterdayStr = format(yesterday, "yyyy-MM-dd");

  const dashboardStats = useDashboardStats({ dateFrom: yesterday, dateTo: yesterday });
  const { data: taskStats, isLoading: tasksLoading } = useTaskStats();
  const { data: cas, isLoading: casLoading } = useCorrectiveActions();
  const { allScores, isLoading: perfLoading } = usePerformanceLeaderboard(yesterdayStr, yesterdayStr);
  const { data: attendanceStats, isLoading: attendanceLoading } = useMvAttendanceStats(yesterdayStr, yesterdayStr);

  const workforceScore = useMemo(() => {
    if (!allScores || allScores.length === 0) return 0;
    return Math.round(allScores.reduce((s, e) => s + e.overall_score, 0) / allScores.length);
  }, [allScores]);

  const openCAsCount = useMemo(() => {
    if (!cas) return 0;
    return cas.filter(ca => CA_OPEN_STATUSES.includes(ca.status as any)).length;
  }, [cas]);

  const taskCompletionRate = useMemo(() => {
    if (!taskStats || taskStats.total === 0) return 0;
    return Math.round((taskStats.completed / taskStats.total) * 100);
  }, [taskStats]);

  const attendanceRate = useMemo(() => {
    if (!attendanceStats || attendanceStats.length === 0) return null;
    const totalPresent = attendanceStats.reduce((s: number, d: any) => s + (d.staff_checked_in || 0), 0);
    const totalExpected = attendanceStats.reduce((s: number, d: any) => s + (d.staff_scheduled || 0), 0);
    if (totalExpected === 0) return null;
    return Math.round((totalPresent / totalExpected) * 100);
  }, [attendanceStats]);

  const isLoading = dashboardStats.isLoading || tasksLoading || casLoading || perfLoading || attendanceLoading;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {t("dashboard.yesterday", "Yesterday's Results")}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard
          title={t("dashboard.kpi.auditScore", "Audit Score")}
          value={isLoading ? "..." : `${dashboardStats.avgScore}%`}
          icon={TrendingUp}
          description={`${dashboardStats.completedAudits} ${t("dashboard.kpi.completed", "completed")}`}
        />
        <StatsCard
          title={t("dashboard.kpi.taskCompletion", "Task Completion")}
          value={isLoading ? "..." : `${taskCompletionRate}%`}
          icon={ListTodo}
          description={`${taskStats?.completed || 0} / ${taskStats?.total || 0}`}
        />
        <StatsCard
          title={t("dashboard.kpi.workforceScore", "Workforce Score")}
          value={isLoading ? "..." : `${workforceScore}%`}
          icon={Users}
          description={`${allScores?.length || 0} ${t("dashboard.kpi.employees", "employees")}`}
        />
        <StatsCard
          title={t("dashboard.kpi.openCAs", "Open CAs")}
          value={isLoading ? "..." : openCAsCount.toString()}
          icon={Shield}
          description={t("dashboard.kpi.needsResolution", "Needs resolution")}
        />
        <StatsCard
          title={t("dashboard.kpi.attendance", "Attendance")}
          value={isLoading ? "..." : attendanceRate !== null ? `${attendanceRate}%` : "N/A"}
          icon={Clock}
          description={attendanceRate !== null ? t("dashboard.kpi.presentRate", "Present rate") : t("dashboard.kpi.noData", "No data")}
        />
      </div>
    </div>
  );
};
