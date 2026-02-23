import { Award, Clock, CheckCircle2, ListTodo, Trophy, TrendingUp, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EffectiveEmployeeScore } from "./effectiveScore";

export interface PerformanceBadge {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // tailwind text class
}

const BADGE_DEFINITIONS: PerformanceBadge[] = [
  { key: "perfect_attendance", name: "Perfect Attendance", description: "100% attendance score this month", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  { key: "always_on_time",     name: "Always On Time",     description: "100% punctuality score this month", icon: Clock,        color: "text-blue-600 dark:text-blue-400" },
  { key: "task_champion",      name: "Task Champion",      description: "100% task completion score this month", icon: ListTodo,     color: "text-purple-600 dark:text-purple-400" },
  { key: "top_3",              name: "Top 3 Finish",       description: "Ranked in top 3 at your location", icon: Trophy,       color: "text-yellow-600 dark:text-yellow-400" },
  { key: "rising_star",        name: "Rising Star",        description: "Score improved 10+ points from last month", icon: TrendingUp,   color: "text-emerald-600 dark:text-emerald-400" },
  { key: "consistency_streak", name: "Consistency Streak",  description: "Score above 80 for 3+ consecutive months", icon: Flame,        color: "text-orange-600 dark:text-orange-400" },
];

export interface MonthlyScoreRecord {
  month: string; // yyyy-MM-dd (first of month)
  effective_score: number | null;
  rank_in_location: number | null;
}

/**
 * Compute which badges the employee earned this month.
 * @param currentScore - The current month's effective score data
 * @param history - Previous months' score records (newest first)
 * @param locationRank - Employee's rank at their location this month (1-based)
 */
export function computeEarnedBadges(
  currentScore: EffectiveEmployeeScore | null,
  history: MonthlyScoreRecord[] = [],
  locationRank: number | null = null
): PerformanceBadge[] {
  if (!currentScore) return [];

  const earned: PerformanceBadge[] = [];

  // Perfect Attendance
  if (currentScore.attendance_used && currentScore.attendance_score >= 100) {
    earned.push(BADGE_DEFINITIONS[0]);
  }

  // Always On Time
  if (currentScore.punctuality_used && currentScore.punctuality_score >= 100) {
    earned.push(BADGE_DEFINITIONS[1]);
  }

  // Task Champion
  if (currentScore.task_used && currentScore.task_score >= 100) {
    earned.push(BADGE_DEFINITIONS[2]);
  }

  // Top 3 Finish
  if (locationRank !== null && locationRank <= 3) {
    earned.push(BADGE_DEFINITIONS[3]);
  }

  // Rising Star - score improved 10+ points from last month
  if (currentScore.effective_score !== null && history.length > 0) {
    const lastMonth = history[0];
    if (lastMonth.effective_score !== null && currentScore.effective_score - lastMonth.effective_score >= 10) {
      earned.push(BADGE_DEFINITIONS[4]);
    }
  }

  // Consistency Streak - above 80 for 3+ consecutive months
  if (currentScore.effective_score !== null && currentScore.effective_score >= 80) {
    const consecutiveAbove80 = history
      .slice(0, 2) // need 2 previous months + current = 3
      .filter(h => h.effective_score !== null && h.effective_score >= 80)
      .length;
    if (consecutiveAbove80 >= 2) {
      earned.push(BADGE_DEFINITIONS[5]);
    }
  }

  return earned;
}

export { BADGE_DEFINITIONS };
