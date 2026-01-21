import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, Clock, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";

export type StatsDialogType = "completed" | "overdue" | "averageScore" | "worstLocation" | "bestLocation";

interface AuditItem {
  id: string;
  location: string;
  audit_date: string;
  overall_score: number | null;
  status: string;
}

interface LocationItem {
  id: string;
  name: string;
  avgScore: number;
  auditCount: number;
}

interface StatsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: StatsDialogType;
  audits?: AuditItem[];
  locations?: LocationItem[];
  title: string;
  description?: string;
}

export const StatsDetailDialog = ({
  open,
  onOpenChange,
  type,
  audits = [],
  locations = [],
  title,
  description,
}: StatsDetailDialogProps) => {
  const { t } = useTranslation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('audits.status.completed')}
          </Badge>
        );
      case "non-compliant":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('dashboard.issuesFound')}
          </Badge>
        );
      case "pending":
      case "draft":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {t('audits.status.inProgress')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {/* For audit lists (completed, overdue) */}
            {(type === "completed" || type === "overdue") && audits.length > 0 && (
              audits.map((audit) => (
                <Link
                  key={audit.id}
                  to={`/audits/${audit.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{audit.location}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {audit.overall_score !== null && audit.overall_score !== undefined && (
                      <span className={`text-lg font-bold ${getScoreColor(audit.overall_score)}`}>
                        {audit.overall_score}%
                      </span>
                    )}
                    {getStatusBadge(audit.status)}
                  </div>
                </Link>
              ))
            )}

            {/* For average score - show score distribution */}
            {type === "averageScore" && audits.length > 0 && (
              audits.map((audit) => (
                <Link
                  key={audit.id}
                  to={`/audits/${audit.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{audit.location}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(audit.overall_score || 0)}`}>
                    {audit.overall_score ?? 0}%
                  </span>
                </Link>
              ))
            )}

            {/* For location rankings (worst/best) */}
            {(type === "worstLocation" || type === "bestLocation") && locations.length > 0 && (
              locations.map((loc, index) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-foreground">{loc.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {loc.auditCount} {loc.auditCount === 1 ? t('common.audit') : t('common.audits')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {type === "bestLocation" ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`text-lg font-bold ${getScoreColor(loc.avgScore)}`}>
                      {loc.avgScore}%
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Empty states */}
            {audits.length === 0 && locations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('common.noDataAvailable')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};