

# RLS Fix: Scope Kiosk Policy Without Breaking Kiosk View

## The Problem

The current kiosk RLS policy on `employees` has no company scoping, leaking cross-tenant data. But we **cannot** simply add `company_id = get_user_company_id(auth.uid())` because:

- The kiosk view (`/kiosk/:token`) runs **outside auth context** (anonymous session, `auth.uid() = NULL`)
- `KioskDashboard.tsx` queries `employees` directly via the Supabase client (lines 111-116)
- Adding company scoping would make `get_user_company_id(NULL)` return `NULL`, breaking the kiosk entirely

## The Safe Fix

Replace the kiosk policy with one that scopes by **location's company** instead of the user's company. The policy should ensure a kiosk can only see employees whose `company_id` matches the company that owns the kiosk's location:

```sql
DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;

CREATE POLICY "Kiosk can view employees at its location"
ON public.employees
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id  -- same company constraint
  )
);
```

This works because:
- **For kiosk (anon)**: The kiosk queries `.eq("location_id", locationId)` — the policy validates that an active kiosk exists at that location AND belongs to the same company as the employee. Since kiosks and employees in the same company share `company_id`, Fresh Brunch kiosks only expose Fresh Brunch employees.
- **For authenticated users from other companies**: Even though the policy is permissive, a PROPER PIZZA user would need an active kiosk at a Fresh Brunch location to see their employees — which doesn't exist. The `ak.company_id = employees.company_id` ensures the kiosk must belong to the employee's company.

## Why This Doesn't Break Fresh Brunch Kiosks

- Fresh Brunch kiosks have `company_id` = Fresh Brunch's UUID
- Fresh Brunch employees have `company_id` = Fresh Brunch's UUID  
- `ak.company_id = employees.company_id` → `true` → employees visible ✓
- PROPER PIZZA has no kiosks → no rows in `attendance_kiosks` → policy returns `false` → no employees leaked ✓

## Files to Modify

| File | Change |
|---|---|
| Database migration | Drop old policy, create new one with `ak.company_id = employees.company_id` |

No UI changes needed. Single migration file.

