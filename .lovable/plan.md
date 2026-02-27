

# Score Investigation Results

## Data from Database (Feb 2026, Bab's Obor)

| Employee | Attendance | Punctuality | Tasks (on-time/assigned) | Warning | Expected Score | Displayed |
|----------|-----------|-------------|--------------------------|---------|---------------|-----------|
| Bogdan Rusu | 18/18 = 100% | 1 late, 269min → 69 | 34/142 = 24% | major (5pts) | ~59 | **100** |
| Ala Aldghrati | 19/19 = 100% | 0 late → 100 | 43/141 = 30% | major (5pts) | ~72 | **67** |
| Bibek Thapa | 18/19 = 95% | 1 late, 88min → 87 | 52/144 = 36% | none | ~73 | **67** |

None of the displayed scores match what the data says they should be.

## Bugs Found

### Bug 1: Individual task completions counted in numerator but not denominator
In `useEmployeePerformance.ts`, `employeeCompletions` (line 409-411) includes completions for `is_individual=true` tasks (tasks with no assignee but marked individual). These completions count toward `completionOnTimeCount` but the corresponding tasks are excluded from `allSharedTasks` (which filters `is_individual = false`), so they never contribute to `sharedTasksAssigned`. This inflates the on-time ratio.

**Fix**: Filter `employeeCompletions` to exclude task IDs not present in `allSharedTasks` (and not in `directTaskIds`).

### Bug 2: Warning penalty invisible to non-manager users (likely cause of Bogdan=100)
The `staff_events` RLS only allows managers/admins to see other employees' warnings. If the kiosk page is accessed by a non-manager user (or anonymous), `warningsData` returns empty, making `warning_penalty = 0` for everyone.

**Fix**: The `useEmployeePerformance` query for `staff_events` should use a backend function (database function with `SECURITY DEFINER`) to fetch warning counts, bypassing RLS for scoring purposes.

### Bug 3: Likely RLS blocking `task_completions` for kiosk
The `task_completions` table has no kiosk-specific RLS policy. If the kiosk session doesn't have a standard authenticated user, `taskCompletions` returns empty, making `sharedTaskOccurrences` empty, `sharedTasksAssigned = 0`, and `task_used = false`. Combined with Bug 2 (no warnings), and if attendance shows no late entries, the score becomes `(100 + 100) / 2 = 100` — which exactly matches Bogdan.

**Fix**: Either add a kiosk RLS policy to `task_completions`, or create a database function that computes performance scores server-side with `SECURITY DEFINER`.

### Bug 4: `attendance_logs` kiosk RLS may filter late entries inconsistently
The kiosk RLS on `attendance_logs` matches by `location_id`. If some attendance records don't have a matching `location_id`, late entries may be invisible, making `punctualityScore = 100` even when the employee was late.

## Recommended Fix: Server-side scoring function

Rather than patching individual RLS policies, create a **database function** (`calculate_location_performance_scores`) with `SECURITY DEFINER` that:
1. Takes `location_id` and date range as parameters
2. Queries all relevant tables without RLS restrictions
3. Returns computed scores per employee
4. Is callable from the kiosk and all other surfaces

This eliminates all RLS-related scoring inconsistencies and also improves performance (single DB call vs 10+ client queries).

## Implementation Steps

1. **Create `calculate_location_performance_scores` DB function** — replicate the scoring logic from `useEmployeePerformance.ts` in SQL/plpgsql, including attendance, punctuality, tasks (shared + direct), tests, reviews, and warning penalties
2. **Fix individual task completion bug** — in `useEmployeePerformance.ts`, filter `employeeCompletions` to only include task IDs present in the shared tasks set
3. **Create a new hook `useLocationPerformanceScores`** that calls the DB function for kiosk and other location-scoped views
4. **Update KioskDashboard** to use the new hook instead of `usePerformanceLeaderboard`

