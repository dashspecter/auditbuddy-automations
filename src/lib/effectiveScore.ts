import type { EmployeePerformanceScore } from "@/hooks/useEmployeePerformance";

/**
 * Extended employee score with effective scoring fields.
 * Effective scoring averages only components with actual data,
 * preventing the "everyone is 100" problem.
 */
export interface EffectiveEmployeeScore extends EmployeePerformanceScore {
  // Which components have real data (USED = true)
  attendance_used: boolean;
  punctuality_used: boolean;
  task_used: boolean;
  test_used: boolean;
  review_used: boolean;
  // Count of components with data
  used_components_count: number;
  // Effective score (averages only USED components, null if none)
  effective_score: number | null;
  // Whether this employee has any activity at all
  has_activity: boolean;
}

/**
 * Determines if each component is "USED" (has real data) and computes
 * the effective overall score.
 */
export function computeEffectiveScore(
  emp: EmployeePerformanceScore
): EffectiveEmployeeScore {
  // Attendance USED if shifts were scheduled (past shifts in range)
  const attendance_used = emp.shifts_scheduled > 0;
  
  // Punctuality USED if they had shifts scheduled (regardless of late status)
  // This way employees who worked on time get credit
  const punctuality_used = emp.shifts_scheduled > 0;
  
  // Tasks USED if tasks were assigned
  const task_used = emp.tasks_assigned > 0;
  
  // Tests USED if tests were taken
  const test_used = emp.tests_taken > 0;
  
  // Reviews USED if reviews exist
  const review_used = emp.reviews_count > 0;

  // Collect scores for USED components only
  const usedScores: number[] = [];
  
  if (attendance_used) usedScores.push(emp.attendance_score);
  if (punctuality_used) usedScores.push(emp.punctuality_score);
  if (task_used) usedScores.push(emp.task_score);
  if (test_used) usedScores.push(emp.test_score);
  if (review_used) usedScores.push(emp.performance_review_score);

  const used_components_count = usedScores.length;
  
  // Effective score is average of USED components minus warning penalty, or null if none
  let effective_score: number | null = null;
  if (used_components_count > 0) {
    const avgScore = usedScores.reduce((a, b) => a + b, 0) / used_components_count;
    effective_score = Math.max(0, Math.min(100, avgScore - (emp.warning_penalty || 0)));
  }

  // Has activity if ANY data point exists
  const has_activity = 
    emp.tasks_completed > 0 ||
    emp.tasks_assigned > 0 ||
    emp.shifts_scheduled > 0 ||
    emp.tests_taken > 0 ||
    emp.reviews_count > 0 ||
    emp.late_count > 0;

  return {
    ...emp,
    attendance_used,
    punctuality_used,
    task_used,
    test_used,
    review_used,
    used_components_count,
    effective_score,
    has_activity,
  };
}

/**
 * Process all employee scores and compute effective scores.
 * Optionally filters to only employees with activity.
 */
export function computeEffectiveScores(
  scores: EmployeePerformanceScore[],
  filterInactive: boolean = false
): EffectiveEmployeeScore[] {
  const result = scores.map(computeEffectiveScore);
  
  if (filterInactive) {
    return result.filter(emp => emp.has_activity);
  }
  
  return result;
}

/**
 * Sort employees by effective score (null scores go to bottom)
 */
export function sortByEffectiveScore(scores: EffectiveEmployeeScore[]): EffectiveEmployeeScore[] {
  return [...scores].sort((a, b) => {
    const scoreA = a.effective_score ?? -1;
    const scoreB = b.effective_score ?? -1;
    return scoreB - scoreA;
  });
}

/**
 * Get display value for effective score
 */
export function formatEffectiveScore(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(1);
}

/**
 * Get display value for component score (shows "—" if not used)
 */
export function formatComponentScore(score: number, isUsed: boolean): string {
  if (!isUsed) return "—";
  return score.toFixed(1);
}

/**
 * Calculate average effective score across employees (excluding null scores)
 */
export function calculateAverageEffectiveScore(scores: EffectiveEmployeeScore[]): number | null {
  const validScores = scores.filter(s => s.effective_score !== null);
  if (validScores.length === 0) return null;
  return validScores.reduce((sum, s) => sum + (s.effective_score || 0), 0) / validScores.length;
}
