import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { AlertTriangle, FileText, Eye, Filter, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { useMyWarnings, useMyWarningsStats, MyWarning } from "@/hooks/useMyWarnings";
import { StaffWarningDetailSheet } from "@/components/staff/StaffWarningDetailSheet";
import { cn } from "@/lib/utils";

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

export default function StaffWarnings() {
  const { t } = useTranslation();
  const { data: warnings, isLoading, error, refetch } = useMyWarnings();
  const { stats } = useMyWarningsStats();
  
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  
  // Detail sheet
  const [selectedWarning, setSelectedWarning] = useState<MyWarning | null>(null);

  // Apply filters
  const filteredWarnings = (warnings || []).filter((w) => {
    if (filterType !== "all" && w.event_type !== filterType) return false;
    if (filterSeverity !== "all" && w.metadata?.severity !== filterSeverity) return false;
    return true;
  });

  // Handle pull to refresh
  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-2">{t("staffWarnings.title", "My Warnings")}</h1>
          <Card className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">
              {t("staffWarnings.errorLoading", "Couldn't load warnings. Pull to retry.")}
            </p>
          </Card>
        </div>
        <StaffBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("staffWarnings.title", "My Warnings")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("staffWarnings.subtitle", "View your recorded warnings and coaching notes")}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">{t("staffWarnings.total", "Total")}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-warning">{stats.warnings}</div>
            <div className="text-xs text-muted-foreground">{t("staffWarnings.warnings", "Warnings")}</div>
          </Card>
          <Card className={cn("p-3 text-center", stats.unseen > 0 && "border-primary")}>
            <div className={cn("text-2xl font-bold", stats.unseen > 0 && "text-primary")}>{stats.unseen}</div>
            <div className="text-xs text-muted-foreground">{t("staffWarnings.unseen", "Unseen")}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("staffWarnings.allTypes", "All Types")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("staffWarnings.allTypes", "All Types")}</SelectItem>
              <SelectItem value="warning">{t("staffWarnings.warningsOnly", "Warnings")}</SelectItem>
              <SelectItem value="coaching_note">{t("staffWarnings.notesOnly", "Coaching Notes")}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("staffWarnings.allSeverities", "All Severities")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("staffWarnings.allSeverities", "All Severities")}</SelectItem>
              <SelectItem value="critical">{t("warnings.critical", "Critical")}</SelectItem>
              <SelectItem value="major">{t("warnings.major", "Major")}</SelectItem>
              <SelectItem value="minor">{t("warnings.minor", "Minor")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Warnings List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredWarnings.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              {filterType === "all" && filterSeverity === "all" ? (
                <>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {t("staffWarnings.noWarnings", "No warnings recorded.")}
                  </p>
                </>
              ) : (
                <>
                  <Filter className="h-6 w-6 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("staffWarnings.noMatchingWarnings", "No warnings match your filters.")}
                  </p>
                </>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWarnings.map((warning) => (
              <Card
                key={warning.id}
                className={cn(
                  "cursor-pointer transition-all active:scale-[0.98]",
                  !warning.seen_at && "border-l-4 border-l-primary"
                )}
                onClick={() => setSelectedWarning(warning)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Top row: Type icon + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {warning.event_type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        
                        {warning.event_type === "warning" && warning.metadata?.severity && (
                          <Badge className={cn("text-xs", SEVERITY_COLORS[warning.metadata.severity])}>
                            {t(`warnings.${warning.metadata.severity}`, warning.metadata.severity)}
                          </Badge>
                        )}
                        
                        {warning.metadata?.category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[warning.metadata.category] || warning.metadata.category}
                          </Badge>
                        )}
                        
                        {!warning.seen_at && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            {t("staffWarnings.new", "New")}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Title/Description */}
                      <p className="font-medium text-sm truncate">
                        {warning.metadata?.title || warning.description}
                      </p>
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{warning.location_name || t("common.global", "Global")}</span>
                        <span>•</span>
                        <span>{format(new Date(warning.event_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <StaffWarningDetailSheet
        warning={selectedWarning}
        onClose={() => setSelectedWarning(null)}
      />

      <StaffBottomNav />
    </div>
  );
}
