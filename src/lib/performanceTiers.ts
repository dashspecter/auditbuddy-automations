import { Trophy, Star, TrendingUp, Target, AlertTriangle, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PerformanceTier {
  name: string;
  key: string;
  minScore: number;
  maxScore: number;
  color: string;       // tailwind text class using semantic tokens
  bgColor: string;     // tailwind bg class
  borderColor: string; // tailwind border class
  icon: LucideIcon;
}

const TIERS: PerformanceTier[] = [
  { name: "Star Performer", key: "star",     minScore: 90, maxScore: 100, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", borderColor: "border-yellow-300 dark:border-yellow-700", icon: Star },
  { name: "High Achiever",  key: "high",     minScore: 80, maxScore: 89,  color: "text-blue-600 dark:text-blue-400",   bgColor: "bg-blue-100 dark:bg-blue-900/30",   borderColor: "border-blue-300 dark:border-blue-700",   icon: Trophy },
  { name: "Steady Progress", key: "steady",  minScore: 60, maxScore: 79,  color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", borderColor: "border-green-300 dark:border-green-700", icon: TrendingUp },
  { name: "Developing",     key: "developing", minScore: 40, maxScore: 59, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", borderColor: "border-amber-300 dark:border-amber-700", icon: Target },
  { name: "Needs Support",  key: "needs",    minScore: 0,  maxScore: 39,  color: "text-red-600 dark:text-red-400",     bgColor: "bg-red-100 dark:bg-red-900/30",     borderColor: "border-red-300 dark:border-red-700",     icon: AlertTriangle },
];

const UNRANKED_TIER: PerformanceTier = {
  name: "New / Unranked", key: "unranked", minScore: -1, maxScore: -1,
  color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-muted",
  icon: HelpCircle,
};

/**
 * Get the tier for a given effective score.
 * Returns "New / Unranked" if score is null.
 */
export function getTier(score: number | null): PerformanceTier {
  if (score === null) return UNRANKED_TIER;
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export { TIERS, UNRANKED_TIER };
