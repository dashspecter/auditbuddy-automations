import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { format, subMonths } from "date-fns";
import { useMemo } from "react";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface WorkforceScorePopupProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const WorkforceScorePopup = ({ dateFrom, dateTo }: WorkforceScorePopupProps) => {
  const { t } = useTranslation();
  const now = new Date();
  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(subMonths(now, 1), "yyyy-MM-dd");
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : format(now, "yyyy-MM-dd");
  const { allScores, isLoading } = usePerformanceLeaderboard(startDate, endDate);

  const { avgScore, topPerformers, atRisk } = useMemo(() => {
    if (!allScores || allScores.length === 0) return { avgScore: 0, topPerformers: [], atRisk: [] };
    const avg = Math.round(allScores.reduce((s, e) => s + e.overall_score, 0) / allScores.length);
    const top = allScores.slice(0, 3);
    const risk = [...allScores].sort((a, b) => a.overall_score - b.overall_score).slice(0, 3);
    return { avgScore: avg, topPerformers: top, atRisk: risk };
  }, [allScores]);

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;
  }

  return (
    <div className="space-y-4">
      {/* Average Score */}
      <div className="text-center p-4 bg-primary/10 rounded-lg">
        <div className="text-4xl font-bold text-primary">{avgScore}%</div>
        <p className="text-sm text-muted-foreground mt-1">{allScores?.length || 0} {t("dashboard.popup.employeesEvaluated", "employees evaluated")}</p>
      </div>

      {/* Top Performers */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> {t("dashboard.popup.topPerformers", "Top Performers")}
        </p>
        {topPerformers.map((e) => (
          <div key={e.employee_id} className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{e.employee_name}</p>
              <p className="text-xs text-muted-foreground truncate">{e.location_name}</p>
            </div>
            <span className="text-sm font-bold text-green-600">{Math.round(e.overall_score)}%</span>
          </div>
        ))}
      </div>

      {/* At Risk */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TrendingDown className="h-3 w-3" /> {t("dashboard.popup.atRisk", "Needs Attention")}
        </p>
        {atRisk.map((e) => (
          <div key={e.employee_id} className="flex items-center gap-2 p-2 rounded-md border border-destructive/20 bg-destructive/5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{e.employee_name}</p>
              <p className="text-xs text-muted-foreground truncate">{e.location_name}</p>
            </div>
            <span className="text-sm font-bold text-destructive">{Math.round(e.overall_score)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
