

# Fix "Pending Approvals" Badge Count Mismatch

## Problem
The "Pending Approvals" button in the Shifts page header (lines 177-186) uses `usePendingApprovals()` which only counts pending **shift assignments**. But the "Approvals 2" button inside the week view filter bar counts shift assignments **+ workforce exceptions + change requests**. The 2 pending items are likely workforce exceptions (e.g. Bogdan's unscheduled clock-in), which the header button ignores — so it shows 0.

## Fix

### `src/pages/workforce/Shifts.tsx`
1. Import `useWorkforceExceptions` and `usePendingChangeRequests` from `useScheduleGovernance`
2. Fetch pending exceptions and change requests (same as `EnhancedShiftWeekView` does)
3. Compute a combined count: `pendingApprovals.length + pendingExceptions.length + (governance ? changeRequests.length : 0)`
4. Use this combined count in both the desktop (line 183) and mobile (line 125) badge renders

This aligns the header button with the filter bar button so both show the same total.

### Files Changed

| File | Change |
|---|---|
| `src/pages/workforce/Shifts.tsx` | Add exception + change request queries, use combined count in badge |

