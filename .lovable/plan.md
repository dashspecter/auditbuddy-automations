

# Fix: Fresh Brunch Kiosks Show Empty After RLS Changes

## Root Cause

The first fix (restricting the employees kiosk policy to `TO anon` only) broke kiosks that have a **stale authenticated session** in the browser.

**How kiosks work**: The kiosk page (`/kiosk/:token`) is outside `AuthProvider` — it's designed for anonymous access. However, the Supabase client is a **singleton with `persistSession: true`**. If anyone ever logged into the admin panel on the kiosk device (e.g., during setup), the auth token persists in `localStorage`. All subsequent kiosk queries are sent as `authenticated` role, not `anon`.

**Before the fix**: The employees kiosk policy was `TO authenticated, anon` — it worked regardless of auth state.

**After the fix**: The policy is `TO anon` only. When the kiosk device has a stale session:
- Queries go as `authenticated` role
- The anon-only kiosk policy is **skipped**
- The authenticated "Users can view employees in their company" policy returns only employees from the **logged-in user's** company
- If the session belongs to a different company (or is expired), employees returns 0
- `employees = 0` → `todaysTeam = 0` → tasks returns `[]` (line 260 in KioskDashboard) → **everything is empty**

The cascade: **0 employees → 0 shifts displayed → 0 tasks → 0 KPIs → 0 champions → completely empty kiosk.**

## The Fix

Replace the `TO anon` only policy with a policy that works for **both roles** but blocks cross-tenant access for authenticated users:

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
  AND (
    auth.uid() IS NULL                                          -- anonymous kiosk: allow
    OR employees.company_id = get_user_company_id(auth.uid())   -- authenticated: same company only
  )
);
```

### Why this is safe (no cross-tenant leak)

| Scenario | auth.uid() | Company check | Result |
|---|---|---|---|
| Anonymous kiosk device | NULL | Skipped (first OR branch) | Sees employees at kiosk location ✓ |
| Fresh Brunch admin testing FB kiosk | FB user | `company_id = FB` → match | Works ✓ |
| PROPER PIZZA admin viewing FB kiosk URL | PP user | `company_id ≠ PP` → blocked | Blocked ✓ |
| PROPER PIZZA admin on admin dashboard | PP user | `company_id ≠ PP` → blocked | No leak ✓ |
| Stale expired session on kiosk tablet | May be NULL | Falls to anon branch | Works ✓ |

### What stays unchanged
- Shifts kiosk policy (`TO public`, no auth check) — already works for both roles
- Shift assignments kiosk policy — already works for both roles
- Employee roles kiosk policy — already works for both roles
- All SECURITY DEFINER RPCs (attendance, tasks, completions) — bypass RLS entirely
- All admin/manager employee policies — untouched
- No code changes needed

**Single migration. Zero code changes. Fixes the kiosk while maintaining cross-tenant isolation.**

