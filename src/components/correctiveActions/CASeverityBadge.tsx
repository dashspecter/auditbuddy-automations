import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CASeverity } from "@/hooks/useCorrectiveActions";

interface CASeverityBadgeProps {
  severity: CASeverity;
  className?: string;
  showPulse?: boolean;
}

const config: Record<CASeverity, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  medium: {
    label: "Medium",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
  critical: {
    label: "Critical",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function CASeverityBadge({ severity, className, showPulse = false }: CASeverityBadgeProps) {
  const { label, className: severityClass } = config[severity] ?? config.medium;
  return (
    <div className="inline-flex items-center gap-1.5">
      {showPulse && severity === "critical" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
        </span>
      )}
      <Badge
        variant="outline"
        className={cn("text-xs font-semibold capitalize", severityClass, className)}
      >
        {label}
      </Badge>
    </div>
  );
}
