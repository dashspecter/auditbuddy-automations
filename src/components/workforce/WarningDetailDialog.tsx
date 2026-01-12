import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { AlertTriangle, FileText, User, MapPin, Calendar, Link, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface WarningDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  attendance: "Attendance",
  punctuality: "Punctuality",
  tasks: "Tasks",
  hygiene_safety: "Hygiene & Safety",
  customer: "Customer Service",
  cash_inventory: "Cash & Inventory",
  policy: "Policy",
  other: "Other",
};

export function WarningDetailDialog({ open, onOpenChange, event }: WarningDetailDialogProps) {
  const { t } = useTranslation();

  if (!event) return null;

  const isWarning = event.event_type === "warning";
  const metadata = event.metadata || {};

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWarning ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            {metadata.title || event.description || (isWarning ? "Warning" : "Coaching Note")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={event.employee?.avatar_url} />
              <AvatarFallback>{getInitials(event.employee?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{event.employee?.full_name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{event.employee?.role}</p>
            </div>
          </div>

          {/* Badges */}
          {isWarning && (
            <div className="flex flex-wrap gap-2">
              {metadata.severity && (
                <Badge className={SEVERITY_COLORS[metadata.severity]}>
                  {String(t(`warnings.${metadata.severity}`, metadata.severity))}
                </Badge>
              )}
              {metadata.category && (
                <Badge variant="outline">
                  {CATEGORY_LABELS[metadata.category] || metadata.category}
                </Badge>
              )}
            </div>
          )}

          <Separator />

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("warnings.dateIssued", "Date Issued")}:</span>
              <span>{format(new Date(event.event_date), 'MMMM dd, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("common.location", "Location")}:</span>
              <span>{event.employee?.locations?.name || "Global"}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("warnings.issuedBy", "Issued By")}:</span>
              <span>{event.creator?.full_name || "Unknown"}</span>
            </div>

            {metadata.evidence_url && (
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("warnings.evidence", "Evidence")}:</span>
                <a 
                  href={metadata.evidence_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[200px]"
                >
                  {metadata.evidence_url}
                </a>
              </div>
            )}

            {metadata.related_audit_id && (
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("warnings.linkedAudit", "Linked Audit")}:</span>
                <span className="text-xs font-mono">{metadata.related_audit_id}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {metadata.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("warnings.notes", "Notes")}:</p>
                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{metadata.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
