import { cn } from "@/lib/utils";

export type AssetCriticality = 'Low' | 'Medium' | 'High';

const criticalityConfig: Record<AssetCriticality, { label: string; color: string }> = {
  Low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  Medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600' },
  High: { label: 'High', color: 'bg-destructive/10 text-destructive' },
};

interface CriticalityBadgeProps {
  criticality: AssetCriticality;
}

export function CriticalityBadge({ criticality }: CriticalityBadgeProps) {
  const config = criticalityConfig[criticality] || criticalityConfig.Medium;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      config.color
    )}>
      {config.label}
    </span>
  );
}
