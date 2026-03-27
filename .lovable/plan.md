

# Fix: Shift Overlap Check Blocks Valid Shift Creation

## Problem

The overlap detection in `useShiftAssignments.ts` has two bugs that cause false positives:

1. **Cancelled shifts not excluded**: The query checks `shift_assignments` joined with `shifts`, but never filters out shifts where `cancelled_at IS NOT NULL`. Deleted/cancelled shifts still count as "existing" and block new assignments.

2. **Self-match on current shift**: When editing a shift and re-assigning the same employee, the overlap query finds the shift being edited itself, triggering a false overlap error.

Both overlap checks (in `useCreateShiftAssignment` at line ~245 and in the batch assign mutation at line ~353) have the same bugs.

## Root Cause Evidence

- Screenshot shows error: *"already has a shift from 09:00:00 to 17:00:00"* when creating a 10:00–17:00 shift
- The 09:00–17:00 shift likely exists from a previous (possibly cancelled) assignment
- Runtime error confirms: `useShiftAssignments.ts:265:31`
- The query at line 245-253 has NO `cancelled_at` filter on the joined `shifts` table

## Fix

### File: `src/hooks/useShiftAssignments.ts`

**Both overlap check queries** (lines ~245–253 and ~353–361) need two additions:

1. **Filter out cancelled shifts** — add `.is("shifts.cancelled_at", null)` to the query
2. **Exclude the current shift** — add `.neq("shift_id", shift_id)` so assigning to the same shift doesn't self-block

Updated query pattern (applied in both locations):

```typescript
const { data: existingAssignments, error: checkError } = await supabase
  .from("shift_assignments")
  .select(`
    id,
    shift_id,
    shifts!inner(shift_date, start_time, end_time, cancelled_at)
  `)
  .eq("staff_id", employee_id)
  .eq("shifts.shift_date", shiftData.shift_date)
  .is("shifts.cancelled_at", null)
  .neq("shift_id", shift_id)        // exclude self
  .neq("approval_status", "rejected");
```

No backend/database changes needed — the fix is purely in the client-side validation logic.

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useShiftAssignments.ts` | Fix both overlap checks: add `cancelled_at` null filter + exclude current shift |

