

# Fix: Shift Deletion via Dash Approved but Not Reflected in UI

## Root Cause

When a user approves a Dash action (like "delete shift") via the ActionPreviewCard, the flow is:

1. UI calls `sendDirectApproval()` in `useDashChat.ts`
2. Backend receives `direct_approval`, resolves `delete_shift` → `execute_shift_deletion`, hard-deletes the shift from the database
3. Backend returns success via SSE stream
4. **UI does nothing** — `useDashChat.ts` has zero query invalidation after approval

The shift is gone from the database but the React Query cache still holds the stale data. The realtime subscription (`useRealtimeShifts.ts`) *should* catch the DELETE event, but backend deletions via the service-role client may not reliably trigger realtime events for the authenticated client channel.

**Result**: The grid keeps showing the deleted shift until the user manually refreshes.

## Fix

**File: `src/hooks/useDashChat.ts`**

After `sendDirectApproval` completes successfully (line 298 `return { success: true }`), invalidate all schedule-related queries. This is a broad but safe invalidation since Dash actions can touch shifts, employees, attendance, corrective actions, work orders, tasks, and training.

Add `useQueryClient` from TanStack Query, then after a successful approval:

```typescript
// After successful execution (line ~297-298)
queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
queryClient.invalidateQueries({ queryKey: ["employee-shifts-multiweek"] });
queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
queryClient.invalidateQueries({ queryKey: ["today-working-staff"] });
queryClient.invalidateQueries({ queryKey: ["team-stats"] });
queryClient.invalidateQueries({ queryKey: ["time-off-requests"] });
queryClient.invalidateQueries({ queryKey: ["employees"] });
queryClient.invalidateQueries({ queryKey: ["corrective-actions"] });
queryClient.invalidateQueries({ queryKey: ["work-orders"] });
queryClient.invalidateQueries({ queryKey: ["attendance"] });
queryClient.invalidateQueries({ queryKey: ["tasks"] });
queryClient.invalidateQueries({ queryKey: ["training"] });
```

This ensures that no matter what Dash action was approved (shift delete, employee update, attendance correction, etc.), the relevant UI data refreshes immediately.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useDashChat.ts` | Import `useQueryClient`; invalidate all domain queries after successful direct approval |

## Validation

1. Ask Dash to delete a shift → approve → shift disappears from the grid immediately
2. Ask Dash to create a shift → approve → shift appears in the grid immediately
3. Ask Dash to update a shift → approve → change reflected immediately

