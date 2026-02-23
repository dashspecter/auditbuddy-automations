import { Award, Clock, CheckCircle2, ListTodo, Trophy, TrendingUp, Flame, Star, Target, Zap, Heart, Shield, Medal, Sparkles, Gift, ThumbsUp, BadgeCheck, Crown, Gem, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EffectiveEmployeeScore } from "./effectiveScore";
import type { BadgeConfigRow } from "@/hooks/useBadgeConfigurations";

export interface PerformanceBadge {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // tailwind text class
}

/** Map icon name strings to actual Lucide components */
export const ICON_MAP: Record<string, LucideIcon> = {
  Award, Clock, CheckCircle2, ListTodo, Trophy, TrendingUp, Flame,
  Star, Target, Zap, Heart, Shield, Medal, Sparkles, Gift,
  ThumbsUp, BadgeCheck, Crown, Gem, Rocket,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const AVAILABLE_COLORS = [
  "text-green-600 dark:text-green-400",
  "text-blue-600 dark:text-blue-400",
  "text-purple-600 dark:text-purple-400",
  "text-yellow-600 dark:text-yellow-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-orange-600 dark:text-orange-400",
  "text-red-600 dark:text-red-400",
  "text-pink-600 dark:text-pink-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-indigo-600 dark:text-indigo-400",
];

export const RULE_TYPES = [
  { value: "attendance_min", label: "Min Attendance Score" },
  { value: "punctuality_min", label: "Min Punctuality Score" },
  { value: "task_min", label: "Min Task Score" },
  { value: "rank_max", label: "Max Rank at Location" },
  { value: "score_improvement", label: "Score Improvement vs Last Month" },
  { value: "streak_min", label: "Score Streak (consecutive months)" },
  { value: "effective_score_min", label: "Min Effective Score" },
  { value: "manual", label: "Manual (awarded by manager)" },
] as const;

// Legacy static definitions kept as fallback
const BADGE_DEFINITIONS: PerformanceBadge[] = [
  { key: "perfect_attendance", name: "Perfect Attendance", description: "100% attendance score this month", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  { key: "always_on_time",     name: "Always On Time",     description: "100% punctuality score this month", icon: Clock,        color: "text-blue-600 dark:text-blue-400" },
  { key: "task_champion",      name: "Task Champion",      description: "100% task completion score this month", icon: ListTodo,     color: "text-purple-600 dark:text-purple-400" },
  { key: "top_3",              name: "Top 3 Finish",       description: "Ranked in top 3 at your location", icon: Trophy,       color: "text-yellow-600 dark:text-yellow-400" },
  { key: "rising_star",        name: "Rising Star",        description: "Score improved 10+ points from last month", icon: TrendingUp,   color: "text-emerald-600 dark:text-emerald-400" },
  { key: "consistency_streak", name: "Consistency Streak",  description: "Score above 80 for 3+ consecutive months", icon: Flame,        color: "text-orange-600 dark:text-orange-400" },
];

export interface MonthlyScoreRecord {
  month: string;
  effective_score: number | null;
  rank_in_location: number | null;
}

function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Award;
}

function evaluateRule(
  config: BadgeConfigRow,
  currentScore: EffectiveEmployeeScore,
  history: MonthlyScoreRecord[],
  locationRank: number | null
): boolean {
  switch (config.rule_type) {
    case "attendance_min":
      return currentScore.attendance_used && currentScore.attendance_score >= config.threshold;
    case "punctuality_min":
      return currentScore.punctuality_used && currentScore.punctuality_score >= config.threshold;
    case "task_min":
      return currentScore.task_used && currentScore.task_score >= config.threshold;
    case "rank_max":
      return locationRank !== null && locationRank <= config.threshold;
    case "score_improvement": {
      if (currentScore.effective_score === null || history.length === 0) return false;
      const lastMonth = history[0];
      if (lastMonth.effective_score === null) return false;
      return currentScore.effective_score - lastMonth.effective_score >= config.threshold;
    }
    case "streak_min": {
      const streakMonths = config.streak_months ?? 3;
      if (currentScore.effective_score === null || currentScore.effective_score < config.threshold) return false;
      const needed = streakMonths - 1; // current month counts as 1
      const consecutiveAbove = history
        .slice(0, needed)
        .filter(h => h.effective_score !== null && h.effective_score >= config.threshold)
        .length;
      return consecutiveAbove >= needed;
    }
    case "effective_score_min":
      return currentScore.effective_score !== null && currentScore.effective_score >= config.threshold;
    case "manual":
      return false; // Future phase
    default:
      return false;
  }
}

/**
 * Compute which badges the employee earned this month.
 * Accepts optional DB configs; falls back to hardcoded defaults.
 */
export function computeEarnedBadges(
  currentScore: EffectiveEmployeeScore | null,
  history: MonthlyScoreRecord[] = [],
  locationRank: number | null = null,
  dbConfigs?: BadgeConfigRow[]
): PerformanceBadge[] {
  if (!currentScore) return [];

  // If DB configs provided, use dynamic evaluation
  if (dbConfigs && dbConfigs.length > 0) {
    return dbConfigs
      .filter(c => c.is_active)
      .filter(c => evaluateRule(c, currentScore, history, locationRank))
      .map(c => ({
        key: c.badge_key,
        name: c.name,
        description: c.description,
        icon: resolveIcon(c.icon),
        color: c.color,
      }));
  }

  // Legacy fallback (hardcoded)
  const earned: PerformanceBadge[] = [];

  if (currentScore.attendance_used && currentScore.attendance_score >= 100) {
    earned.push(BADGE_DEFINITIONS[0]);
  }
  if (currentScore.punctuality_used && currentScore.punctuality_score >= 100) {
    earned.push(BADGE_DEFINITIONS[1]);
  }
  if (currentScore.task_used && currentScore.task_score >= 100) {
    earned.push(BADGE_DEFINITIONS[2]);
  }
  if (locationRank !== null && locationRank <= 3) {
    earned.push(BADGE_DEFINITIONS[3]);
  }
  if (currentScore.effective_score !== null && history.length > 0) {
    const lastMonth = history[0];
    if (lastMonth.effective_score !== null && currentScore.effective_score - lastMonth.effective_score >= 10) {
      earned.push(BADGE_DEFINITIONS[4]);
    }
  }
  if (currentScore.effective_score !== null && currentScore.effective_score >= 80) {
    const consecutiveAbove80 = history
      .slice(0, 2)
      .filter(h => h.effective_score !== null && h.effective_score >= 80)
      .length;
    if (consecutiveAbove80 >= 2) {
      earned.push(BADGE_DEFINITIONS[5]);
    }
  }

  return earned;
}

/**
 * Convert DB configs to PerformanceBadge[] for display (e.g. in explainer card)
 */
export function configsToBadgeDefinitions(configs: BadgeConfigRow[]): PerformanceBadge[] {
  return configs
    .filter(c => c.is_active)
    .map(c => ({
      key: c.badge_key,
      name: c.name,
      description: c.description,
      icon: resolveIcon(c.icon),
      color: c.color,
    }));
}

export { BADGE_DEFINITIONS };
