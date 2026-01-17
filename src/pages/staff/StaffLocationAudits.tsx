import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, Calendar, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMyScheduledAudits, useMyAudits } from "@/hooks/useMyScheduledAudits";
import { useAuditTemplateFields } from "@/hooks/useAuditTemplateFields";
import { computeLocationAuditPercent } from "@/lib/locationAuditScoring";
import { format, isToday, isTomorrow, isPast, parseISO, addDays, startOfDay, endOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

export default function StaffLocationAudits() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Use same data source as calendar for scheduled audits
  const { data: scheduledAudits = [], isLoading: scheduledLoading } = useMyScheduledAudits();
  // Use all audits for completed/draft history
  const { data: allMyAudits = [], isLoading: allLoading } = useMyAudits();
  
  const isLoading = scheduledLoading || allLoading;

  // Categorize scheduled audits
  const categorizedAudits = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const next14Days = endOfDay(addDays(now, 14));

    const overdue: typeof scheduledAudits = [];
    const today: typeof scheduledAudits = [];
    const tomorrow: typeof scheduledAudits = [];
    const upcoming: typeof scheduledAudits = [];

    scheduledAudits.forEach((audit) => {
      const status = audit.status?.toLowerCase();
      // Only process non-completed audits for scheduled sections
      if (status === "compliant" || status === "non-compliant" || status === "completed") {
        return;
      }

      const scheduledStart = audit.scheduled_start ? parseISO(audit.scheduled_start) : null;
      if (!scheduledStart) return;

      if (isPast(scheduledStart) && scheduledStart < todayStart) {
        overdue.push(audit);
      } else if (scheduledStart >= todayStart && scheduledStart <= todayEnd) {
        today.push(audit);
      } else if (scheduledStart > todayEnd && scheduledStart <= tomorrowEnd) {
        tomorrow.push(audit);
      } else if (scheduledStart > tomorrowEnd && scheduledStart <= next14Days) {
        upcoming.push(audit);
      }
    });

    return { overdue, today, tomorrow, upcoming };
  }, [scheduledAudits]);

  // Completed audits (from all audits)
  const completedAudits = useMemo(() => {
    return allMyAudits
      .filter((a) => {
        const status = a.status?.toLowerCase();
        return status === "compliant" || status === "non-compliant" || status === "completed";
      })
      .slice(0, 10); // Show last 10 completed
  }, [allMyAudits]);

  const allTemplateIds = useMemo(() => {
    const allAudits = [
      ...categorizedAudits.overdue,
      ...categorizedAudits.today,
      ...categorizedAudits.tomorrow,
      ...categorizedAudits.upcoming,
      ...completedAudits
    ];
    return allAudits.map((a) => a.template_id).filter(Boolean) as string[];
  }, [categorizedAudits, completedAudits]);

  const { data: fieldsByTemplateId } = useAuditTemplateFields(allTemplateIds);

  const getScore = (audit: any) => {
    const fields = audit.template_id ? fieldsByTemplateId?.[audit.template_id] : undefined;
    const computed = computeLocationAuditPercent(fields, audit.custom_data);
    return computed ?? audit.overall_score ?? null;
  };

  const getStatusInfo = (audit: any) => {
    const status = audit.status?.toLowerCase() || "scheduled";
    const scheduledStart = audit.scheduled_start ? parseISO(audit.scheduled_start) : null;
    
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
      case "non-compliant":
        return {
          label: t("common.nonCompliant", "Non-Compliant"),
          className: "bg-destructive/20 text-destructive border-destructive/30",
          icon: AlertTriangle
        };
      case "completed":
        return {
          label: t("common.completed", "Completed"),
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

  const formatAuditDate = (audit: any) => {
    // For scheduled audits, use scheduled_start
    if (audit.scheduled_start) {
      const date = parseISO(audit.scheduled_start);
      if (isToday(date)) {
        return `${t("common.today", "Today")} ${format(date, "HH:mm")}`;
      }
      if (isTomorrow(date)) {
        return `${t("common.tomorrow", "Tomorrow")} ${format(date, "HH:mm")}`;
      }
      return format(date, "MMM d, HH:mm");
    }
    // Fallback to created_at
    return format(new Date(audit.created_at), "MMM d, yyyy");
  };

  const renderAuditCard = (audit: any) => {
    const statusInfo = getStatusInfo(audit);
    const StatusIcon = statusInfo.icon;
    const score = getScore(audit);

    return (
      <Card
        key={audit.id}
        className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => navigate(`/staff/audits/${audit.id}`)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <StatusIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">
                {audit.locations?.name || audit.location || t("common.unknownLocation", "Unknown Location")}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatAuditDate(audit)}
              </div>
              {audit.audit_templates?.name && (
                <div className="text-xs text-muted-foreground truncate">
                  {audit.audit_templates.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {score !== null && (
              <span className="text-sm font-semibold">{score}%</span>
            )}
            <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
              {statusInfo.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Card>
    );
  };

  const renderSection = (title: string, audits: typeof scheduledAudits, emptyMessage?: string) => {
    if (audits.length === 0 && !emptyMessage) return null;

    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title} ({audits.length})
        </h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {audits.map(renderAuditCard)}
          </div>
        )}
      </div>
    );
  };

  const hasScheduledAudits = 
    categorizedAudits.overdue.length > 0 ||
    categorizedAudits.today.length > 0 ||
    categorizedAudits.tomorrow.length > 0 ||
    categorizedAudits.upcoming.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-safe mt-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff")} className="touch-target">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t("staffHome.checker.myAudits", "My Audits")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("staffHome.checker.auditsAssignedToYou", "Audits assigned to you")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !hasScheduledAudits && completedAudits.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("staffHome.checker.noAuditsYet", "No audits yet.")}
            </p>
            <Button className="mt-3" onClick={() => navigate("/staff/location-audit")}>
              {t("staffHome.checker.createAudit", "Create Audit")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overdue - Red alert */}
            {categorizedAudits.overdue.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("common.overdue", "Overdue")} ({categorizedAudits.overdue.length})
                </h2>
                <div className="space-y-2">
                  {categorizedAudits.overdue.map(renderAuditCard)}
                </div>
              </div>
            )}

            {/* Today */}
            {renderSection(t("common.today", "Today"), categorizedAudits.today)}

            {/* Tomorrow */}
            {renderSection(t("common.tomorrow", "Tomorrow"), categorizedAudits.tomorrow)}

            {/* Upcoming (next 14 days) */}
            {renderSection(t("common.upcoming", "Upcoming"), categorizedAudits.upcoming)}

            {/* Completed */}
            {completedAudits.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("common.recentlyCompleted", "Recently Completed")} ({completedAudits.length})
                </h2>
                <div className="space-y-2">
                  {completedAudits.map(renderAuditCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
