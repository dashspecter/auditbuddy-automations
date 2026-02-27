

# Fix: Waste Entry Edit Not Persisting

## Investigation Summary

The edit form and mutation code look structurally correct. The most likely cause is that the Supabase `.update()` is being **blocked by RLS** and the resulting error toast is either not visible enough or being swallowed. Here's why:

- The UPDATE RLS policy on `waste_entries` requires the user to be an admin, manager, company_owner, company_admin, OR the entry creator (with `status = 'recorded'`).
- If the `.update()` matches 0 rows (RLS blocks), `.select().single()` throws a PGRST116 error ("no rows"), which fires the `onError` toast — but the generic error message may not be clear.
- Additionally, the `onSuccess` callback in `handleSaveEdit` only closes the dialog — the "Success" toast from the hook fires, but if the mutation actually failed, the error toast may flash briefly.

## Changes

### 1. Add explicit error handling in `handleSaveEdit` (`WasteReports.tsx`)
- Add `onError` callback alongside `onSuccess` in `handleSaveEdit` to show a prominent error toast
- Keep the dialog open on error so the user knows it failed

### 2. Add `onSettled` refetch in `useUpdateWasteEntry` (`useWaste.ts`)
- After the mutation settles (success or error), force refetch `waste_entries` and `waste_report` queries to ensure the UI always shows the latest data
- This addresses potential stale-cache edge cases

### 3. Verify RLS policy allows edit for the current user role
- Add a `WITH CHECK` clause to the UPDATE policy that mirrors `USING` — currently relying on implicit behavior
- Ensure the policy correctly allows field-level updates (weight, reason, notes) without requiring admin for all cases

### 4. Add console logging to mutation for debugging
- Log the update payload and response in `useUpdateWasteEntry` to help diagnose future issues

