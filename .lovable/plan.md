

# Fix: Key Icon Not Showing After Login Account Creation

## Root Cause
The login account **is being created successfully** — the database confirms `user_id` is set for Grecea Alexandru, and the toast says "Login account created successfully!". The problem is a **stale UI**: after the `create-user` edge function succeeds, the code never invalidates the employees query cache, so the StaffTable keeps showing old data (no key icon). A hard page refresh would show the icon.

## Fix — `src/components/EmployeeDialog.tsx`

Add `queryClient` (from `useQueryClient`) and invalidate the employee queries after successful login account creation in **both** code paths:

1. **Import**: Add `useQueryClient` from `@tanstack/react-query` (already imported in the file for other hooks — verify and add if missing)

2. **Hook**: Add `const queryClient = useQueryClient();` near the other hooks at the top of the component

3. **New employee path** (around line 348, after `toast.success`):
   ```typescript
   queryClient.invalidateQueries({ queryKey: ["employees"] });
   queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
   queryClient.invalidateQueries({ queryKey: ["employees-cursor"] });
   ```

4. **Edit dialog "Create Login Account" button** (around line 848, after `toast.success`):
   ```typescript
   queryClient.invalidateQueries({ queryKey: ["employees"] });
   queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
   queryClient.invalidateQueries({ queryKey: ["employees-cursor"] });
   ```

This matches the exact same invalidation pattern already used by `useCreateEmployee`, `useUpdateEmployee`, and `useDeleteEmployee` in `src/hooks/useEmployees.ts`.

## What does NOT change
- No edge function changes
- No database changes
- No auth flow changes
- No StaffTable changes
- No other component changes

## Result
After creating a login account (either during new employee creation or via the edit dialog), the employee list immediately refreshes and the key icon appears without needing a page reload.

