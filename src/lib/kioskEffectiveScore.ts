import type { EmployeePerformanceScore } from "@/hooks/useEmployeePerformance";

/**
 * Computes a kiosk-specific "effective overall score" that only averages
 * components with real data, rather than defaulting missing components to 100.
 * 
 * This prevents the "everyone is 100" trap where employees with no data
 * appear as top performers.
 */
export interface KioskEmployeeScore extends EmployeePerformanceScore {
  // Which components have real data (USED = true)
  attendance_used: boolean;
  punctuality_used: boolean;
  task_used: boolean;
  test_used: boolean;
  review_used: boolean;
  // Count of components with data
  used_components_count: number;
  // Kiosk-only effective score (averages only USED components, null if none)
  kiosk_effective_overall_score: number | null;
  // Whether this employee has any activity at all
  has_activity: boolean;
}

/**
 * Determines if each component is "USED" (has real data) and computes
 * the kiosk effective overall score.
 */
export function computeKioskEffectiveScore(
  emp: EmployeePerformanceScore
): KioskEmployeeScore {
  // Attendance USED if shifts were scheduled (past shifts in range)
  const attendance_used = emp.shifts_scheduled > 0;
  
  // Punctuality USED if there were any late arrivals
  // (if no lates, punctuality shouldn't inflate the score - they just had no data)
  const punctuality_used = emp.late_count > 0 || emp.total_late_minutes > 0;
  
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
  
  // Effective score is average of USED components, or null if none
  const kiosk_effective_overall_score = used_components_count > 0
    ? usedScores.reduce((a, b) => a + b, 0) / used_components_count
    : null;

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
    kiosk_effective_overall_score,
    has_activity,
  };
}

/**
 * Process all employee scores and compute kiosk effective scores.
 * Filters to only employees with activity.
 */
export function computeKioskLeaderboardScores(
  scores: EmployeePerformanceScore[]
): KioskEmployeeScore[] {
  return scores
    .map(computeKioskEffectiveScore)
    .filter(emp => emp.has_activity);
}
