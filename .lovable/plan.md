

# Fix: Cancelled shifts still showing on schedule grid

## Problem
When Dash deletes/cancels a shift, `executeShiftDeletion` does two things:
1. Deletes the shift assignment (employee link)
2. Soft-cancels the shift record (`status: "cancelled"`, `cancelled_at: now()`)

But the `useShifts` hook fetches ALL shifts without filtering out cancelled ones. So the shift remains visible on the grid as "Unassigned".

## Fix (two-pronged)

### 1. Filter cancelled shifts from the grid query
In `src/hooks/useShifts.ts`, add `.is("cancelled_at", null)` to the base query so cancelled shifts never appear on the scheduling grid.

### 2. Actually delete the shift record (preferred behavior)
Since the user's intent is to **remove** the shift entirely (not just mark it cancelled), update `executeShiftDeletion` in `supabase/functions/dash-command/capabilities/workforce.ts` to **hard-delete** the shift record instead of soft-cancelling it. This is consistent with the UI messaging ("Shift cancelled", "Assignment removed") and the user's expectation.

Both changes will be applied:
- **Frontend filter** (defensive — ensures no cancelled shift ever leaks into the grid regardless of source)
- **Backend hard-delete** (correct behavior — the shift is truly removed, not lingering in the DB)

### Files to change
- `src/hooks/useShifts.ts` — add `cancelled_at` null filter
- `supabase/functions/dash-command/capabilities/workforce.ts` — change soft-cancel to hard-delete in `executeShiftDeletion`

