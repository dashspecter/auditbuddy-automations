import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import { useCorrectiveActions, isOverdue, CorrectiveAction } from "@/hooks/useCorrectiveActions";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { DashboardPreviewDialog } from "./DashboardPreviewDialog";
import { format } from "date-fns";

export const OpenCorrectiveActionsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: cas, isLoading } = useCorrectiveActions();
  const [selectedCA, setSelectedCA] = useState<CorrectiveAction | null>(null);

  const stats = useMemo(() => {
    if (!cas) return { open: 0, inProgress: 0, overdue: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const active = cas.filter(ca => ca.status === "open" || ca.status === "in_progress");
    return {
      open: cas.filter(ca => ca.status === "open").length,
      inProgress: cas.filter(ca => ca.status === "in_progress").length,
      overdue: active.filter(ca => isOverdue(ca.due_at)).length,
      critical: active.filter(ca => ca.severity === "critical").length,
      high: active.filter(ca => ca.severity === "high").length,
      medium: active.filter(ca => ca.severity === "medium").length,
      low: active.filter(ca => ca.severity === "low").length,
    };
  }, [cas]);

  const recentCAs = useMemo(() => {
    if (!cas) return [];
    return cas
      .filter(ca => ca.status === "open" || ca.status === "in_progress")
      .slice(0, 4);
  }, [cas]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            <Shield className="h-4 w-4 text-primary inline mr-2" />
            {t("dashboard.ca.title", "Corrective Actions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const totalActive = stats.open + stats.inProgress;

  const severityColor = (s: string) => {
    if (s === "critical") return "bg-destructive/15 text-destructive border-destructive/30";
    if (s === "high") return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t("dashboard.ca.title", "Corrective Actions")}
          </CardTitle>
          {stats.overdue > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.overdue} {t("dashboard.ca.overdue", "overdue")}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-xl font-bold">{totalActive}</div>
              <div className="text-xs text-muted-foreground">{t("dashboard.ca.active", "Active")}</div>
            </div>
            <div className="text-center p-2 bg-destructive/10 rounded-md">
              <div className="text-xl font-bold text-destructive">{stats.critical + stats.high}</div>
              <div className="text-xs text-muted-foreground">{t("dashboard.ca.highSeverity", "High/Critical")}</div>
            </div>
            <div className="text-center p-2 bg-warning/10 rounded-md">
              <div className="text-xl font-bold text-warning">{stats.overdue}</div>
              <div className="text-xs text-muted-foreground">{t("dashboard.ca.pastSLA", "Past SLA")}</div>
            </div>
          </div>

          {recentCAs.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("dashboard.ca.recent", "Recent")}
              </div>
              {recentCAs.map(ca => (
                <div
                  key={ca.id}
                  className={`p-2 rounded-md border cursor-pointer hover:bg-accent/5 transition-colors ${
                    isOverdue(ca.due_at) ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedCA(ca)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ca.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {ca.locations?.name || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${severityColor(ca.severity)}`}>
                      {ca.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              ✅ {t("dashboard.ca.noOpen", "No open corrective actions")}
            </div>
          )}

          <Button
            variant="link"
            className="w-full mt-2 text-xs"
            onClick={() => navigate("/corrective-actions")}
          >
            {t("dashboard.ca.viewAll", "View All CAs")} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {selectedCA && (
        <DashboardPreviewDialog
          open={!!selectedCA}
          onOpenChange={(open) => !open && setSelectedCA(null)}
          title={selectedCA.title}
          description={t("dashboard.popup.caDetails", "Corrective Action details")}
          navigateTo={`/corrective-actions/${selectedCA.id}`}
          navigateLabel={t("dashboard.popup.goToCA", "View Full Details")}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">{t("common.severity", "Severity")}</p>
                <Badge variant="outline" className={`mt-1 ${severityColor(selectedCA.severity)}`}>
                  {selectedCA.severity}
                </Badge>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">{t("common.status", "Status")}</p>
                <p className="text-sm font-medium mt-1">{selectedCA.status}</p>
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">{t("common.location", "Location")}</p>
              <p className="text-sm font-medium mt-1">{selectedCA.locations?.name || "—"}</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">{t("common.dueDate", "Due Date")}</p>
              <p className={`text-sm font-medium mt-1 ${isOverdue(selectedCA.due_at) ? "text-destructive" : ""}`}>
                {format(new Date(selectedCA.due_at), "PPP")}
                {isOverdue(selectedCA.due_at) && ` (${t("common.overdue", "Overdue")})`}
              </p>
            </div>
            {selectedCA.description && (
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">{t("common.description", "Description")}</p>
                <p className="text-sm mt-1">{selectedCA.description}</p>
              </div>
            )}
          </div>
        </DashboardPreviewDialog>
      )}
    </>
  );
};
