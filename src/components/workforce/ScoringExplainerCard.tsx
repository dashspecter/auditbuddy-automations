import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { TIERS } from "@/lib/performanceTiers";
import { BADGE_DEFINITIONS, configsToBadgeDefinitions } from "@/lib/performanceBadges";
import { useBadgeConfigurations } from "@/hooks/useBadgeConfigurations";
import { cn } from "@/lib/utils";

export function ScoringExplainerCard() {
  const [open, setOpen] = useState(false);
  const { configs } = useBadgeConfigurations();

  // Use DB configs if available, fall back to static
  const badges = configs.length > 0 ? configsToBadgeDefinitions(configs) : BADGE_DEFINITIONS;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-blue-500" />
              How Scoring Works
              {open ? (
                <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Effective Score */}
            <div>
              <h4 className="font-semibold text-sm mb-1">Effective Score</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The effective score is the average of only the <strong>active</strong> components 
                (Attendance, Punctuality, Tasks, Tests, Reviews). If an employee has no data for 
                a component, it's excluded from the average — preventing inflated scores. 
                Warning penalties are subtracted from the average, with a 90-day linear decay.
              </p>
            </div>

            {/* Tiers */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Performance Tiers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {TIERS.map(tier => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={tier.key}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2",
                        tier.bgColor,
                        tier.borderColor
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", tier.color)} />
                      <span className={cn("text-xs font-semibold", tier.color)}>
                        {tier.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {tier.minScore}–{tier.maxScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Badges */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Monthly Badges</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {badges.map(badge => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.key}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 bg-accent/5"
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", badge.color)} />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold">{badge.name}</span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
