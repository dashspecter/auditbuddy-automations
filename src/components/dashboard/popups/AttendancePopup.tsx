import { useMvAttendanceStats } from "@/hooks/useMaterializedViews";
import { format, subMonths } from "date-fns";
import { useMemo } from "react";
import { Clock, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface AttendancePopupProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const AttendancePopup = ({ dateFrom, dateTo }: AttendancePopupProps) => {
  const { t } = useTranslation();
  const now = new Date();
  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(subMonths(now, 1), "yyyy-MM-dd");
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : format(now, "yyyy-MM-dd");
  const { data: stats, isLoading } = useMvAttendanceStats(startDate, endDate);

  const computed = useMemo(() => {
    if (!stats || stats.length === 0)
      return { rate: 0, totalScheduled: 0, totalPresent: 0, lateCount: 0, totalLateMin: 0 };
    const totalScheduled = stats.reduce((s, d) => s + (d.staff_scheduled || 0), 0);
    const totalPresent = stats.reduce((s, d) => s + (d.staff_checked_in || 0), 0);
    const lateCount = stats.reduce((s, d) => s + (d.late_count || 0), 0);
    const totalLateMin = stats.reduce((s, d) => s + (d.total_late_minutes || 0), 0);
    return {
      rate: totalScheduled > 0 ? Math.round((totalPresent / totalScheduled) * 100) : 0,
      totalScheduled,
      totalPresent,
      lateCount,
      totalLateMin,
    };
  }, [stats]);

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;
  }

  return (
    <div className="space-y-4">
      {/* Attendance Rate */}
      <div className="text-center p-4 bg-primary/10 rounded-lg">
        <div className="text-4xl font-bold text-primary">{computed.rate}%</div>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.popup.presentRate", "Present Rate")}</p>
        <Progress value={computed.rate} className="mt-2 h-2" />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">{computed.totalPresent}/{computed.totalScheduled}</div>
          <div className="text-xs text-muted-foreground">{t("dashboard.popup.checkedIn", "Checked In")}</div>
        </div>
        <div className="p-3 rounded-md bg-warning/10 text-center">
          <Clock className="h-4 w-4 mx-auto mb-1 text-warning" />
          <div className="text-lg font-bold text-warning">{computed.lateCount}</div>
          <div className="text-xs text-muted-foreground">{t("dashboard.popup.lateArrivals", "Late Arrivals")}</div>
        </div>
      </div>

      {computed.totalLateMin > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {computed.totalLateMin} {t("dashboard.popup.totalLateMinutes", "total late minutes")}
        </p>
      )}
    </div>
  );
};
