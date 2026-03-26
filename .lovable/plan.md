

# Fix: Shifts not appearing in Multi-Week View after creation

## Root Cause

The multi-week view uses query key `["employee-shifts-multiweek", employeeId, startDate, endDate]`, but every shift mutation (create, update, delete) and the realtime subscription only invalidate `["shifts"]`. The multi-week query is never refreshed — so newly created shifts don't appear until the sheet is closed and reopened.

## Fix

### Option A (Chosen — minimal, targeted)

Add `employee-shifts-multiweek` invalidation alongside `shifts` in 3 places:

1. **`src/hooks/useShifts.ts`** — in `useCreateShift`, `useUpdateShift`, `useDeleteShift` `onSuccess` callbacks, add:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ["employee-shifts-multiweek"] });
   ```

2. **`src/hooks/useRealtimeShifts.ts`** — in both realtime handlers (shifts table + shift_assignments table), add the same invalidation.

This ensures the multi-week grid refreshes after any shift change, whether triggered by the user or by realtime updates from another user.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useShifts.ts` | Add `employee-shifts-multiweek` invalidation in create/update/delete onSuccess |
| `src/hooks/useRealtimeShifts.ts` | Add `employee-shifts-multiweek` invalidation in both realtime handlers |

