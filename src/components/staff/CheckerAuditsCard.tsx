import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, ArrowRight, CheckCircle2, Calendar, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyScheduledAudits, useMyAudits } from "@/hooks/useMyScheduledAudits";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAuditTemplateFields } from "@/hooks/useAuditTemplateFields";
import { computeLocationAuditPercent } from "@/lib/locationAuditScoring";

export const CheckerAuditsCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use same data source as calendar for scheduled audits
  const { data: scheduledAudits = [], isLoading: scheduledLoading } = useMyScheduledAudits();
  // Use all audits for stats (completed, drafts)
  const { data: allMyAudits = [], isLoading: allLoading } = useMyAudits();

  const isLoading = scheduledLoading || allLoading;

  // Stats from ALL audits (completed, drafts, etc.)
  const stats = useMemo(() => {
    const total = allMyAudits.length;
    const completed = allMyAudits.filter(
      (a) => a.status === "compliant" || a.status === "non-compliant" || a.status === "completed"
    ).length;
    const drafts = allMyAudits.filter((a) => a.status === "draft" || !a.status).length;
    const scheduled = scheduledAudits.filter((a) => a.status === "scheduled").length;
    return { total, completed, drafts, scheduled };
  }, [allMyAudits, scheduledAudits]);

  // Upcoming audits: scheduled audits that haven't been completed, sorted by scheduled_start
  const upcomingAudits = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return scheduledAudits
      .filter((audit) => {
        const status = audit.status?.toLowerCase();
        if (status === "compliant" || status === "non-compliant" || status === "completed") return false;
        if (!audit.scheduled_start) return false;
        const date = parseISO(audit.scheduled_start);
        return date >= weekStart && date <= weekEnd;
      })
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
      .slice(0, 3);
  }, [scheduledAudits]);

  const templateIds = useMemo(
    () => upcomingAudits.map((a) => a.template_id).filter(Boolean) as string[],
    [upcomingAudits]
  );

  const { data: fieldsByTemplateId } = useAuditTemplateFields(templateIds);

  const getStatusInfo = (audit: any) => {
    const status = audit.status?.toLowerCase() || "scheduled";
    const scheduledStart = audit.scheduled_start ? parseISO(audit.scheduled_start) : null;
    
    // Check if overdue
    if (scheduledStart && isPast(scheduledStart) && status === "scheduled") {
      return {
        label: t("common.overdue", "Overdue"),
        className: "bg-destructive/20 text-destructive border-destructive/30",
        icon: AlertTriangle
      };
    }
    
    switch (status) {
      case "compliant":
        return {
          label: t("common.compliant", "Compliant"),
          className: "bg-success/20 text-success border-success/30",
          icon: CheckCircle2
        };
      case "in_progress":
        return {
          label: t("common.inProgress", "In Progress"),
          className: "bg-primary/20 text-primary border-primary/30",
          icon: Clock
        };
      case "scheduled":
        return {
          label: t("common.scheduled", "Scheduled"),
          className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
          icon: Calendar
        };
      default:
        return {
          label: status || "scheduled",
          className: "bg-muted text-muted-foreground border-border",
          icon: Clock
        };
    }
  };

  const formatScheduledDate = (audit: any) => {
    if (!audit.scheduled_start) return "";
    const date = parseISO(audit.scheduled_start);
    
    if (isToday(date)) {
      return `${t("common.today", "Today")} ${format(date, "HH:mm")}`;
    }
    if (isTomorrow(date)) {
      return `${t("common.tomorrow", "Tomorrow")} ${format(date, "HH:mm")}`;
    }
    return format(date, "MMM d, HH:mm");
  };

  const getScore = (audit: any) => {
    const fields = audit.template_id ? fieldsByTemplateId?.[audit.template_id] : undefined;
    const computed = computeLocationAuditPercent(fields, audit.custom_data);
    return computed ?? audit.overall_score ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Create Audit Card */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{t("staffHome.checker.audits", "Audits")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("staffHome.checker.createAndManage", "Create and manage location audits")}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {stats.total} {t("common.total", "total")}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-background rounded-md p-2 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-xs text-muted-foreground">{t("common.scheduled", "Scheduled")}</div>
          </div>
          <div className="bg-background rounded-md p-2 text-center">
            <div className="text-lg font-bold text-success">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">{t("common.completed", "Completed")}</div>
          </div>
          <div className="bg-background rounded-md p-2 text-center">
            <div className="text-lg font-bold text-warning">{stats.drafts}</div>
            <div className="text-xs text-muted-foreground">{t("common.drafts", "Drafts")}</div>
          </div>
        </div>

        <Button className="w-full" onClick={() => navigate("/staff/location-audit")}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("staffHome.checker.createAudit", "Create Audit")}
        </Button>
      </Card>

      {/* Upcoming Scheduled Audits */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">{t("staffHome.checker.upcomingAudits", "Upcoming Audits")}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => navigate("/staff/audits")}
          >
            {t("common.viewAll", "View All")} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : upcomingAudits.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t("staffHome.checker.noAuditsThisWeek", "No audits scheduled this week")}
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAudits.map((audit) => {
              const statusInfo = getStatusInfo(audit);
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={audit.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/staff/audits/${audit.id}`)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {audit.locations?.name || audit.location || t("common.unknownLocation", "Unknown Location")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatScheduledDate(audit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
