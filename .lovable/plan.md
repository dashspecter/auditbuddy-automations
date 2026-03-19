

# Fix: Workforce Score Shows 0% — Broken RPC Column References

## Root Cause

The `calculate_location_performance_scores` database function references **3 columns that don't exist** in the `task_completions` table. This causes the entire RPC to throw an error, returning 0 employees — hence "0% / 0 employees" on the dashboard.

The column names were likely renamed during a previous migration but the RPC was never updated.

| Used in RPC | Actual Column |
|-------------|---------------|
| `tc.employee_id` | `tc.completed_by_employee_id` |
| `tc.completed_date` | `tc.occurrence_date` |
| `tc.time_slot` | `tc.scheduled_time` |

These appear in **3 queries** inside the function (lines 310, 311, 312, 329, 330).

## Fix

**Single database migration** to recreate the function with the correct column names:

1. Replace `tc.employee_id` → `tc.completed_by_employee_id` (2 occurrences)
2. Replace `tc.completed_date` → `tc.occurrence_date` (2 occurrences)
3. Replace `tc.time_slot` → `tc.scheduled_time` (1 occurrence)

No frontend changes needed — the hook and UI code are correct; they just receive an empty array because the RPC errors out.

## Files to Change

| File | Change |
|------|--------|
| Database migration | `CREATE OR REPLACE FUNCTION calculate_location_performance_scores` with 3 column name fixes |

