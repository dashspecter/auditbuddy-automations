

# Fix All 3 Scoring Bugs in `calculate_location_performance_scores` RPC

## Bugs to Fix

1. **Task score exceeds 100%** — cross-role completions inflate the numerator beyond the denominator. Cap `v_task_score` at 100.

2. **Guest-shift employees invisible** — the RPC loops `WHERE e.location_id = p_location_id`, missing employees who have approved shifts at the location but whose home location differs (e.g., Sorin Comoli). Change the employee query to also include employees with approved shift assignments at the target location in the date range.

3. **Individual tasks not scored** — the RPC excludes `is_individual = true` tasks entirely. Individual tasks should be counted per-employee: each individual task assigned at the location (matching role) counts as 1 assigned task per employee, and each completion by that specific employee counts as 1 completion.

4. **Unify effective scoring** — stop defaulting missing components to 100. Instead, only average components with real data (matching client-side `effectiveScore.ts` logic). This prevents "everyone is 100" inflation.

## Changes

### 1. Database Migration — Update `calculate_location_performance_scores` RPC

Replace the function with fixes:

- **Employee loop**: Change `WHERE e.location_id = p_location_id` to:
  ```sql
  WHERE e.status = 'active' AND (
    e.location_id = p_location_id
    OR e.id IN (
      SELECT sa.staff_id FROM shift_assignments sa
      JOIN shifts s ON s.id = sa.shift_id
      WHERE s.location_id = p_location_id
        AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
        AND sa.approval_status = 'approved'
    )
  )
  ```

- **Individual tasks**: Remove the `COALESCE(t.is_individual, false) = false` filter from shared tasks. Instead, for individual tasks at the location matching the employee's role, count 1 assigned per employee per occurrence, and count completions where `completed_by_employee_id = v_emp.id`.

- **Cap task score**: `v_task_score := LEAST(100, ...)` explicitly on the task score calculation.

- **Effective scoring**: Replace the "default to 100" pattern with tracking which components are used:
  ```sql
  IF v_shifts_scheduled > 0 THEN
    v_attendance_score := ...;
    -- add to used scores
  END IF;
  -- Average only used scores
  ```

### 2. Update `snapshot-monthly-scores/index.ts` edge function
Apply the same individual-task fix and task-score cap to keep the monthly snapshot consistent.

### 3. Files to modify
- **Database migration**: `CREATE OR REPLACE FUNCTION calculate_location_performance_scores` — all 4 fixes
- **`supabase/functions/snapshot-monthly-scores/index.ts`** — individual task counting + task score cap

### What we preserve
- The `EmployeePerformanceScore` interface (no changes)
- Client-side `effectiveScore.ts` and `kioskEffectiveScore.ts` continue working as-is
- All existing consumers of the RPC remain compatible (same return columns)

