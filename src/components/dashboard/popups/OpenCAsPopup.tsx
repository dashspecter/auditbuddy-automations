import { useCorrectiveActions, isOverdue } from "@/hooks/useCorrectiveActions";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const OpenCAsPopup = () => {
  const { t } = useTranslation();
  const { data: cas, isLoading } = useCorrectiveActions();

  const { stats, recentCAs } = useMemo(() => {
    if (!cas) return { stats: { open: 0, inProgress: 0, overdue: 0, critical: 0, high: 0, medium: 0, low: 0 }, recentCAs: [] };
    const active = cas.filter(ca => ca.status === "open" || ca.status === "in_progress");
    return {
      stats: {
        open: cas.filter(ca => ca.status === "open").length,
        inProgress: cas.filter(ca => ca.status === "in_progress").length,
        overdue: active.filter(ca => isOverdue(ca.due_at)).length,
        critical: active.filter(ca => ca.severity === "critical").length,
        high: active.filter(ca => ca.severity === "high").length,
        medium: active.filter(ca => ca.severity === "medium").length,
        low: active.filter(ca => ca.severity === "low").length,
      },
      recentCAs: active.slice(0, 5),
    };
  }, [cas]);

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;
  }

  const severityColor = (s: string) => {
    if (s === "critical") return "bg-destructive/15 text-destructive border-destructive/30";
    if (s === "high") return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400";
    if (s === "medium") return "bg-warning/15 text-warning border-warning/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Severity Breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t("common.critical", "Critical"), value: stats.critical, cls: "bg-destructive/10 text-destructive" },
          { label: t("common.high", "High"), value: stats.high, cls: "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" },
          { label: t("common.medium", "Medium"), value: stats.medium, cls: "bg-warning/10 text-warning" },
          { label: t("common.low", "Low"), value: stats.low, cls: "bg-muted/50" },
        ].map((s) => (
          <div key={s.label} className={`text-center p-2 rounded-md ${s.cls}`}>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="flex gap-4 text-sm">
        <span>{t("common.open", "Open")}: <strong>{stats.open}</strong></span>
        <span>{t("common.inProgress", "In Progress")}: <strong>{stats.inProgress}</strong></span>
        <span className="text-destructive">{t("common.overdue", "Overdue")}: <strong>{stats.overdue}</strong></span>
      </div>

      {/* Recent CAs */}
      {recentCAs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.popup.recentCAs", "Active CAs")}
          </p>
          {recentCAs.map((ca) => (
            <div key={ca.id} className={`p-2 rounded-md border ${isOverdue(ca.due_at) ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ca.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{ca.locations?.name || "—"}</p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${severityColor(ca.severity)}`}>
                  {ca.severity}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
