

# Fix: "Assign To" Dropdown Shows Only Current User

## Root Cause

The `company_users` table has a restrictive SELECT RLS policy:

```
"Users can view their own company membership"
USING (auth.uid() = user_id)
```

When the Schedule Audit dialog fetches all company users to populate the "Assign To" dropdown, this policy only returns the current user's own row. Result: Vlad can only assign audits to himself.

## The Fix

Add a new SELECT policy that allows any authenticated user to see all members of their own company:

```sql
CREATE POLICY "Users can view company members in their company"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
);
```

This is safe because:
- It only exposes `user_id` and `company_id` for users in the **same company** — no cross-tenant leak
- The existing restrictive policy already allows self-viewing; this extends it to same-company viewing
- Managers and admins need this to assign audits, shifts, tasks to other team members
- Multiple features beyond audit scheduling likely depend on this (shift assignment, task assignment, etc.)

## What Changes

| Change | Detail |
|---|---|
| Database migration | Add SELECT policy on `company_users` for same-company visibility |

No UI or code changes needed. The existing query in `ScheduleAuditDialog.tsx` will automatically return all company users once the RLS policy permits it.

## Impact

After this fix, the "Assign To" dropdown will show all 7 Fresh Brunch users (managers, checkers, staff) instead of just the current user.

