import { TrendingUp, ListTodo, Users, Shield, GraduationCap, Clock } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTaskStats } from "@/hooks/useTasks";
import { useCorrectiveActions } from "@/hooks/useCorrectiveActions";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { useTrainingAssignments } from "@/hooks/useTrainingAssignments";
import { useMvAttendanceStats } from "@/hooks/useMaterializedViews";
import { format, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardPreviewDialog } from "./DashboardPreviewDialog";
import { AuditScorePopup } from "./popups/AuditScorePopup";
import { TaskCompletionPopup } from "./popups/TaskCompletionPopup";
import { WorkforceScorePopup } from "./popups/WorkforceScorePopup";
import { OpenCAsPopup } from "./popups/OpenCAsPopup";
import { TrainingPopup } from "./popups/TrainingPopup";
import { AttendancePopup } from "./popups/AttendancePopup";

type PopupType = "audit" | "tasks" | "workforce" | "cas" | "training" | "attendance" | null;

interface CrossModuleStatsRowProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const CrossModuleStatsRow = ({ dateFrom, dateTo }: CrossModuleStatsRowProps) => {
  const { t } = useTranslation();
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  const dashboardStats = useDashboardStats({ dateFrom, dateTo });
  const { data: taskStats, isLoading: tasksLoading } = useTaskStats();
  const { data: cas, isLoading: casLoading } = useCorrectiveActions();
  const { data: assignments, isLoading: trainingLoading } = useTrainingAssignments();

  const now = new Date();
  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(subMonths(now, 1), "yyyy-MM-dd");
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : format(now, "yyyy-MM-dd");
  
  const { allScores, isLoading: perfLoading } = usePerformanceLeaderboard(startDate, endDate);
  const { data: attendanceStats, isLoading: attendanceLoading } = useMvAttendanceStats(startDate, endDate);

  const taskCompletionRate = useMemo(() => {
    if (!taskStats || taskStats.total === 0) return 0;
    return Math.round((taskStats.completed / taskStats.total) * 100);
  }, [taskStats]);

  const workforceScore = useMemo(() => {
    if (!allScores || allScores.length === 0) return 0;
    return Math.round(allScores.reduce((s, e) => s + e.overall_score, 0) / allScores.length);
  }, [allScores]);

  const openCAsCount = useMemo(() => {
    if (!cas) return 0;
    return cas.filter(ca => ca.status === "open" || ca.status === "in_progress").length;
  }, [cas]);

  const trainingCompliance = useMemo(() => {
    if (!assignments || assignments.length === 0) return null;
    const completed = assignments.filter((a: any) => a.status === "completed").length;
    return Math.round((completed / assignments.length) * 100);
  }, [assignments]);

  const attendanceRate = useMemo(() => {
    if (!attendanceStats || attendanceStats.length === 0) return null;
    const totalPresent = attendanceStats.reduce((s: number, d: any) => s + (d.staff_checked_in || 0), 0);
    const totalExpected = attendanceStats.reduce((s: number, d: any) => s + (d.staff_scheduled || 0), 0);
    if (totalExpected === 0) return null;
    return Math.round((totalPresent / totalExpected) * 100);
  }, [attendanceStats]);

  const isLoading = dashboardStats.isLoading || tasksLoading || casLoading || perfLoading || trainingLoading || attendanceLoading;

  const popupConfig: Record<Exclude<PopupType, null>, { title: string; navigateTo: string; navigateLabel: string }> = {
    audit: { title: t("dashboard.kpi.auditScore", "Audit Score"), navigateTo: "/audits", navigateLabel: t("dashboard.popup.goToAudits", "Go to Audits") },
    tasks: { title: t("dashboard.kpi.taskCompletion", "Task Completion"), navigateTo: "/tasks", navigateLabel: t("dashboard.popup.goToTasks", "Go to Tasks") },
    workforce: { title: t("dashboard.kpi.workforceScore", "Workforce Score"), navigateTo: "/workforce", navigateLabel: t("dashboard.popup.goToWorkforce", "Go to Workforce") },
    cas: { title: t("dashboard.kpi.openCAs", "Open CAs"), navigateTo: "/corrective-actions", navigateLabel: t("dashboard.popup.goToCAs", "Go to Corrective Actions") },
    training: { title: t("dashboard.kpi.trainingCompliance", "Training"), navigateTo: "/training", navigateLabel: t("dashboard.popup.goToTraining", "Go to Training") },
    attendance: { title: t("dashboard.kpi.attendance", "Attendance"), navigateTo: "/attendance", navigateLabel: t("dashboard.popup.goToAttendance", "Go to Attendance") },
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title={t("dashboard.kpi.auditScore", "Audit Score")}
          value={isLoading ? "..." : `${dashboardStats.avgScore}%`}
          icon={TrendingUp}
          description={t("dashboard.kpi.avgAcrossLocations", "Avg across locations")}
          onClick={() => setActivePopup("audit")}
        />
        <StatsCard
          title={t("dashboard.kpi.taskCompletion", "Task Completion")}
          value={isLoading ? "..." : `${taskCompletionRate}%`}
          icon={ListTodo}
          description={`${taskStats?.overdue || 0} ${t("dashboard.kpi.overdue", "overdue")}`}
          onClick={() => setActivePopup("tasks")}
        />
        <StatsCard
          title={t("dashboard.kpi.workforceScore", "Workforce Score")}
          value={isLoading ? "..." : `${workforceScore}%`}
          icon={Users}
          description={`${allScores?.length || 0} ${t("dashboard.kpi.employees", "employees")}`}
          onClick={() => setActivePopup("workforce")}
        />
        <StatsCard
          title={t("dashboard.kpi.openCAs", "Open CAs")}
          value={isLoading ? "..." : openCAsCount.toString()}
          icon={Shield}
          description={t("dashboard.kpi.needsResolution", "Needs resolution")}
          onClick={() => setActivePopup("cas")}
        />
        <StatsCard
          title={t("dashboard.kpi.trainingCompliance", "Training")}
          value={isLoading ? "..." : trainingCompliance !== null ? `${trainingCompliance}%` : "N/A"}
          icon={GraduationCap}
          description={trainingCompliance !== null ? t("dashboard.kpi.completionRate", "Completion rate") : t("dashboard.kpi.noAssignments", "No assignments")}
          onClick={() => setActivePopup("training")}
        />
        <StatsCard
          title={t("dashboard.kpi.attendance", "Attendance")}
          value={isLoading ? "..." : attendanceRate !== null ? `${attendanceRate}%` : "N/A"}
          icon={Clock}
          description={attendanceRate !== null ? t("dashboard.kpi.presentRate", "Present rate") : t("dashboard.kpi.noData", "No data")}
          onClick={() => setActivePopup("attendance")}
        />
      </div>

      {activePopup && (
        <DashboardPreviewDialog
          open={!!activePopup}
          onOpenChange={(open) => !open && setActivePopup(null)}
          title={popupConfig[activePopup].title}
          navigateTo={popupConfig[activePopup].navigateTo}
          navigateLabel={popupConfig[activePopup].navigateLabel}
        >
          {activePopup === "audit" && <AuditScorePopup dateFrom={dateFrom} dateTo={dateTo} />}
          {activePopup === "tasks" && <TaskCompletionPopup />}
          {activePopup === "workforce" && <WorkforceScorePopup dateFrom={dateFrom} dateTo={dateTo} />}
          {activePopup === "cas" && <OpenCAsPopup />}
          {activePopup === "training" && <TrainingPopup />}
          {activePopup === "attendance" && <AttendancePopup dateFrom={dateFrom} dateTo={dateTo} />}
        </DashboardPreviewDialog>
      )}
    </>
  );
};
