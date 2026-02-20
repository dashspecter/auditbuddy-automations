import { useTrainingAssignments } from "@/hooks/useTrainingAssignments";
import { useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

export const TrainingPopup = () => {
  const { t } = useTranslation();
  const { data: assignments, isLoading } = useTrainingAssignments();

  const stats = useMemo(() => {
    if (!assignments || assignments.length === 0)
      return { total: 0, completed: 0, inProgress: 0, planned: 0, overdue: 0, rate: 0 };
    const completed = assignments.filter((a: any) => a.status === "completed").length;
    const inProgress = assignments.filter((a: any) => a.status === "in_progress").length;
    const planned = assignments.filter((a: any) => a.status === "planned").length;
    const overdue = assignments.filter((a: any) => a.status === "overdue").length;
    return {
      total: assignments.length,
      completed,
      inProgress,
      planned,
      overdue,
      rate: Math.round((completed / assignments.length) * 100),
    };
  }, [assignments]);

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;
  }

  return (
    <div className="space-y-4">
      {/* Completion Rate */}
      <div className="text-center p-4 bg-primary/10 rounded-lg">
        <div className="text-4xl font-bold text-primary">{stats.rate}%</div>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.popup.completionRate", "Completion Rate")}</p>
        <Progress value={stats.rate} className="mt-2 h-2" />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t("common.completed", "Done"), value: stats.completed, cls: "bg-primary/10 text-primary" },
          { label: t("common.inProgress", "Active"), value: stats.inProgress, cls: "bg-muted/50" },
          { label: t("common.planned", "Planned"), value: stats.planned, cls: "bg-muted/50" },
          { label: t("common.overdue", "Overdue"), value: stats.overdue, cls: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <div key={s.label} className={`text-center p-2 rounded-md ${s.cls}`}>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {stats.total} {t("dashboard.popup.totalAssignments", "total training assignments")}
      </p>
    </div>
  );
};
