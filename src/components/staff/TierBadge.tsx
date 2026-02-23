import { getTier } from "@/lib/performanceTiers";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  score: number | null;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ score, size = "sm", showLabel = true, className }: TierBadgeProps) {
  const tier = getTier(score);
  const Icon = tier.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", tier.bgColor, tier.borderColor, className)}>
      <Icon className={cn("shrink-0", tier.color, size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      {showLabel && (
        <span className={cn("font-semibold whitespace-nowrap", tier.color, size === "sm" ? "text-xs" : "text-sm")}>
          {tier.name}
        </span>
      )}
    </div>
  );
}
