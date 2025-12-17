import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Archive } from "lucide-react";

export type AssetStatus = 'Active' | 'Down' | 'Retired';

const statusConfig: Record<AssetStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  Active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
  Down: { label: 'Down', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle },
  Retired: { label: 'Retired', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
};

interface AssetStatusBadgeProps {
  status: AssetStatus;
  showIcon?: boolean;
}

export function AssetStatusBadge({ status, showIcon = true }: AssetStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.Active;
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      config.color
    )}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
