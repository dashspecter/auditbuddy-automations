

# Bug: Employee Edits Don't Persist in the Staff Table View

## Root Cause

`StaffTable.tsx` uses the `useEmployeesCursor` hook (query key: `["employees-cursor"]`). After a successful update, `useUpdateEmployee` invalidates:
- `["employees"]`
- `["employees-paginated"]`

But it does **NOT** invalidate `["employees-cursor"]`. So the cached employee data remains stale, and when you re-open the Edit dialog, you see the old values.

Notably, `useDeleteEmployee` already correctly invalidates all three query keys — the update mutation was simply missed.

## The Fix

Add `queryClient.invalidateQueries({ queryKey: ["employees-cursor"] })` to the `onSuccess` callback of `useUpdateEmployee` in `src/hooks/useEmployees.ts`.

For consistency, also add it to `useCreateEmployee`'s `onSuccess`.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useEmployees.ts` | Add `["employees-cursor"]` invalidation to `useUpdateEmployee` and `useCreateEmployee` `onSuccess` callbacks |

One file, two one-line additions.

