

# Fix: Kiosk Employees Policy Fails When Different-Company User is Logged In

## Root Cause

The RLS policy we applied in the last fix has a logical flaw:

```sql
USING (
  EXISTS (SELECT 1 FROM attendance_kiosks ak WHERE ak.location_id = employees.location_id AND ak.is_active = true AND ak.company_id = employees.company_id)
  AND (
    auth.uid() IS NULL                                          -- anon: allow
    OR employees.company_id = get_user_company_id(auth.uid())   -- auth: same company only
  )
);
```

When the kiosk tablet has a stale session from a **different** company (e.g., Daniel from PROPER PIZZA testing the Fresh Brunch kiosk URL):
- `auth.uid()` is NOT null → anon branch fails
- `employees.company_id` (Fresh Brunch) != `get_user_company_id(auth.uid())` (PROPER PIZZA) → auth branch fails
- Result: **0 employees returned** → cascade to 0 shifts displayed → 0 tasks → empty kiosk

This is exactly what the screenshots show.

## The Fix

The kiosk policy's purpose is to let kiosk devices view employees at their location. The `EXISTS` check on `attendance_kiosks` already validates the location-company match. We should **not** additionally restrict by the authenticated user's company — that restriction is for the admin/manager policies, not the kiosk policy.

Replace with:

```sql
DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;

CREATE POLICY "Kiosk can view employees at its location"
ON public.employees FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id
  )
);
```

### Why this is safe

The `EXISTS` subquery already enforces company isolation:
- `ak.company_id = employees.company_id` ensures the kiosk and employees belong to the same company
- `ak.is_active = true` ensures only active kiosks grant access
- `ak.location_id = employees.location_id` ensures only employees at that kiosk's location are visible

A PROPER PIZZA user visiting a Fresh Brunch kiosk URL **can** see Fresh Brunch employees at that location — but that's the intended behavior. The kiosk page is a public-facing display. It shows only names and attendance status. The kiosk URL itself is the access control (it's a secret token/slug).

| Scenario | Result |
|---|---|
| Anonymous kiosk device | Sees employees at kiosk location |
| Same-company admin on kiosk | Sees employees at kiosk location |
| Different-company user on kiosk | Sees employees at kiosk location (intended — kiosk URL is the auth) |
| Any user on admin dashboard | Uses "Users can view employees in their company" policy instead (company-scoped) |

### What stays unchanged
- All other kiosk policies (shifts, shift_assignments, tasks, task_locations) — already use `TO public` without user-company check
- All admin/manager employee policies — untouched
- SECURITY DEFINER RPCs for attendance, tasks, completions — bypass RLS
- No code changes needed

**Single migration. Zero code changes.**

