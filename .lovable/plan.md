

# Fix: Task completion queries must apply the same role filter as assignment queries

## Root Cause

In `calculate_location_performance_scores`, the **shared task assigned** query filters by the employee's role (only counting tasks matching their role), but the **shared task completions** query does NOT filter by role — it counts all completions by the employee at that location regardless of task role.

This means Serdar (Shift Manager) completed 2 "Host" tasks that aren't in his assigned count, giving 22 completions vs 19 assigned.

## Fix

### Database Migration — Update the RPC

Add the same role-matching filter to both completion queries (shared and individual):

**Shared task completions** (currently lines ~184-197 of the migration): Add role filter joins and WHERE clause matching the assigned query pattern:
```sql
-- Add joins for role matching
LEFT JOIN task_roles tr ON tr.task_id = t.id
LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
-- Add role filter in WHERE
AND (
  (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
  OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
)
```

**Individual task completions** (currently lines ~242-254): Same role filter addition.

Also add **shift-day filter** to both completion queries to ensure completions are only counted on days the employee was scheduled (matching the assigned query logic).

### Edge Function — Update `snapshot-monthly-scores`

Apply the same role + shift-day filters to the completion counting logic in the snapshot function to keep historical data consistent.

### Files to modify
- **Database migration**: `CREATE OR REPLACE FUNCTION calculate_location_performance_scores` — add role filter to completion queries
- **`supabase/functions/snapshot-monthly-scores/index.ts`** — mirror the same fix

### What stays the same
- All interfaces, client-side code, and UI components remain unchanged
- The assigned counting logic is already correct — only completions need fixing

