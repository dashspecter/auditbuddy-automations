import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { AlertTriangle, FileText, MapPin, Calendar, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMarkWarningSeen, MyWarning } from "@/hooks/useMyWarnings";
import { cn } from "@/lib/utils";

interface StaffWarningDetailSheetProps {
  warning: MyWarning | null;
  onClose: () => void;
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

export function StaffWarningDetailSheet({ warning, onClose }: StaffWarningDetailSheetProps) {
  const { t } = useTranslation();
  const markSeen = useMarkWarningSeen();

  // Mark as seen when opened
  useEffect(() => {
    if (warning && !warning.seen_at) {
      markSeen.mutate(warning.id);
    }
  }, [warning?.id]);

  if (!warning) return null;

  const isWarning = warning.event_type === "warning";
  const metadata = warning.metadata || {};

  return (
    <Sheet open={!!warning} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            {isWarning ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="flex-1">
              {isWarning ? t("staffWarnings.warningDetails", "Warning Details") : t("staffWarnings.noteDetails", "Coaching Note Details")}
            </span>
            {warning.seen_at && (
              <Badge variant="outline" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                {t("staffWarnings.seen", "Seen")}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-8">
          {/* Title */}
          <div>
            <p className="text-lg font-semibold">
              {metadata.title || warning.description}
            </p>
          </div>

          {/* Badges */}
          {isWarning && (
            <div className="flex flex-wrap gap-2">
              {metadata.severity && (
                <Badge className={cn("text-sm", SEVERITY_COLORS[metadata.severity])}>
                  {t(`warnings.${metadata.severity}`, metadata.severity)}
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

          {/* Details Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("staffWarnings.dateIssued", "Date Issued")}</p>
                <p className="font-medium">{format(new Date(warning.event_date), 'MMMM dd, yyyy')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("common.location", "Location")}</p>
                <p className="font-medium">{warning.location_name || t("common.global", "Global")}</p>
              </div>
            </div>
          </div>

          {/* Notes/Description */}
          {metadata.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">{t("staffWarnings.notes", "Notes")}</p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{metadata.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* If no notes but has description different from title */}
          {!metadata.notes && warning.description && warning.description !== metadata.title && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">{t("staffWarnings.description", "Description")}</p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{warning.description}</p>
                </div>
              </div>
            </>
          )}

          {/* Evidence link if available */}
          {metadata.evidence_url && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">{t("staffWarnings.evidence", "Evidence")}</p>
                <a
                  href={metadata.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all"
                >
                  {metadata.evidence_url}
                </a>
              </div>
            </>
          )}

          {/* Info footer */}
          <div className="pt-4">
            <p className="text-xs text-muted-foreground text-center">
              {t("staffWarnings.readOnlyInfo", "This is a read-only view of your record.")}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
