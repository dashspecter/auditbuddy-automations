import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";
import type { PerformanceBadge } from "@/lib/performanceBadges";
import { cn } from "@/lib/utils";

interface BadgesSectionProps {
  badges: PerformanceBadge[];
}

export function BadgesSection({ badges }: BadgesSectionProps) {
  if (badges.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm">My Badges</span>
        </div>
        <p className="text-xs text-muted-foreground">
          No badges earned yet this month. Keep improving to unlock achievements!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">My Badges</span>
        <span className="ml-auto text-xs text-muted-foreground">{badges.length} earned</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.key}
              className="flex items-center gap-2 rounded-lg border p-2.5 bg-accent/5"
            >
              <Icon className={cn("h-5 w-5 shrink-0", badge.color)} />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{badge.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{badge.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
