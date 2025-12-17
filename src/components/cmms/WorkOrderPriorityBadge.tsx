import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";

export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

const priorityConfig: Record<WorkOrderPriority, { label: string; color: string; icon: typeof ArrowUp }> = {
  Low: { label: 'Low', color: 'text-muted-foreground', icon: ArrowDown },
  Medium: { label: 'Medium', color: 'text-amber-500', icon: Minus },
  High: { label: 'High', color: 'text-orange-500', icon: ArrowUp },
  Urgent: { label: 'Urgent', color: 'text-destructive', icon: AlertTriangle },
};

interface WorkOrderPriorityBadgeProps {
  priority: WorkOrderPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function WorkOrderPriorityBadge({ priority, showLabel = true, size = 'sm' }: WorkOrderPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.Medium;
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1",
      config.color,
      size === 'sm' ? "text-xs" : "text-sm"
    )}>
      <Icon className={size === 'sm' ? "h-3 w-3" : "h-4 w-4"} />
      {showLabel && <span className="font-medium">{config.label}</span>}
    </span>
  );
}
