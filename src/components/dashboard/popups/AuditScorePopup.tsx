import { useDashboardStats } from "@/hooks/useDashboardStats";
import { TrendingUp, MapPin, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface AuditScorePopupProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const AuditScorePopup = ({ dateFrom, dateTo }: AuditScorePopupProps) => {
  const { t } = useTranslation();
  const stats = useDashboardStats({ dateFrom, dateTo });

  return (
    <div className="space-y-4">
      {/* Main Score */}
      <div className="text-center p-4 bg-primary/10 rounded-lg">
        <div className="text-4xl font-bold text-primary">{stats.avgScore}%</div>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.popup.avgAuditScore", "Average Audit Score")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{stats.totalAudits}</div>
          <div className="text-xs text-muted-foreground">{t("dashboard.popup.total", "Total")}</div>
        </div>
        <div className="text-center p-3 bg-primary/10 rounded-md">
          <div className="text-lg font-bold text-primary">{stats.completedAudits}</div>
          <div className="text-xs text-muted-foreground">{t("dashboard.popup.completed", "Completed")}</div>
        </div>
        <div className="text-center p-3 bg-destructive/10 rounded-md">
          <div className="text-lg font-bold text-destructive">{stats.overdueAudits}</div>
          <div className="text-xs text-muted-foreground">{t("dashboard.popup.overdue", "Overdue")}</div>
        </div>
      </div>

      {/* Best / Worst Location */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <Award className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{t("dashboard.popup.bestLocation", "Best Location")}</p>
            <p className="text-sm font-medium truncate">{stats.bestLocation.name}</p>
          </div>
          <span className="text-sm font-bold text-green-600">{stats.bestLocation.score}%</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/20 bg-destructive/5">
          <MapPin className="h-4 w-4 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{t("dashboard.popup.worstLocation", "Needs Improvement")}</p>
            <p className="text-sm font-medium truncate">{stats.worstLocation.name}</p>
          </div>
          <span className="text-sm font-bold text-destructive">{stats.worstLocation.score}%</span>
        </div>
      </div>
    </div>
  );
};
