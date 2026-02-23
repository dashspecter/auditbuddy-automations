import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTier, TIERS, UNRANKED_TIER } from "@/lib/performanceTiers";
import type { EffectiveEmployeeScore } from "@/lib/effectiveScore";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface TierDistributionCardProps {
  scores: EffectiveEmployeeScore[];
}

export function TierDistributionCard({ scores }: TierDistributionCardProps) {
  const distribution = useMemo(() => {
    const allTiers = [...TIERS, UNRANKED_TIER];
    const counts = new Map<string, number>();
    allTiers.forEach(t => counts.set(t.key, 0));

    scores.forEach(s => {
      const tier = getTier(s.effective_score);
      counts.set(tier.key, (counts.get(tier.key) || 0) + 1);
    });

    return allTiers.map(tier => ({
      ...tier,
      count: counts.get(tier.key) || 0,
      percentage: scores.length > 0
        ? Math.round(((counts.get(tier.key) || 0) / scores.length) * 100)
        : 0,
    }));
  }, [scores]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Tier Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {distribution.map(tier => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.key}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center",
                  tier.bgColor,
                  tier.borderColor
                )}
              >
                <Icon className={cn("h-5 w-5", tier.color)} />
                <span className={cn("text-xs font-semibold leading-tight", tier.color)}>
                  {tier.name}
                </span>
                <span className="text-2xl font-bold">{tier.count}</span>
                <span className="text-[10px] text-muted-foreground">
                  {tier.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
