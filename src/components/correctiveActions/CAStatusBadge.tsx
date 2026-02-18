import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CAStatus } from "@/hooks/useCorrectiveActions";

interface CAStatusBadgeProps {
  status: CAStatus;
  className?: string;
}

const config: Record<CAStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  pending_verification: {
    label: "Pending Verification",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",
  },
  closed: {
    label: "Closed",
    className: "bg-success/15 text-success border-success/30",
  },
  reopened: {
    label: "Reopened",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function CAStatusBadge({ status, className }: CAStatusBadgeProps) {
  const { label, className: statusClass } = config[status] ?? config.open;
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold", statusClass, className)}>
      {label}
    </Badge>
  );
}
