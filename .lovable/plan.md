

# Fix: Kiosk RLS Policy Leaks Employee Data to All Authenticated Users

## Root Cause

The kiosk policy we created earlier has a critical flaw. It applies to **both `anon` AND `authenticated` roles**:

```sql
CREATE POLICY "Kiosk can view employees at its location"
ON public.employees FOR SELECT
TO authenticated, anon   -- ← BUG: includes authenticated users
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id
  )
);
```

Because RLS permissive policies are **OR'd together**, any authenticated user (including Daniel from PROPER PIZZA) can see employees at **any location that has an active kiosk** — regardless of company. The policy checks that `ak.company_id = employees.company_id` (kiosk and employee same company), but it does NOT check that the **requesting user** belongs to that company. Fresh Brunch has 5 active kiosks across their locations, so Daniel sees all Fresh Brunch employees at those locations.

**Data proof:**
- Daniel (PROPER PIZZA) has `get_user_company_id` = `7919a60f` (PROPER PIZZA, 0 employees)
- The "Users can view employees in their company" policy correctly returns 0 rows for him
- BUT the kiosk policy matches all Fresh Brunch employees at kiosk locations (5 kiosks → covers most of their 65 employees), leaking ~29 active ones

## The Fix

Restrict the kiosk policy to `anon` role only, since kiosks operate without authentication:

```sql
DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;

CREATE POLICY "Kiosk can view employees at its location"
ON public.employees
FOR SELECT
TO anon   -- Only anonymous kiosk sessions, NOT authenticated users
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id
  )
);
```

This is the only change needed. One migration, zero code changes.

## Why This Is Safe

- **Kiosks use anonymous sessions** (`auth.uid() = NULL`) — they only need the `anon` role
- **Authenticated users** already have proper policies: "Users can view employees in their company" (scoped by `get_user_company_id`) and "Employees can view their own record"
- **PROPER PIZZA** will correctly see 0 employees (they have none)
- **Fresh Brunch** kiosks continue working exactly as before (anonymous, scoped by company)

