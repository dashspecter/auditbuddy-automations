

# Fix: PROPER PIZZA Seeing Fresh Brunch Employees via Kiosk RLS Policy

## Root Cause

The kiosk employees policy we just created is **too permissive for authenticated users**:

```sql
-- Current (leaking)
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id
  )
)
```

Fresh Brunch has 5 active kiosks across 4 locations, covering 34 employees. Since this policy applies to `authenticated` users too, Daniel (PROPER PIZZA) on the admin dashboard gets **both** policies OR'd together:
1. "Users can view employees in their company" → PROPER PIZZA employees (29)
2. "Kiosk can view employees at its location" → Fresh Brunch employees at kiosk locations (34)

Result: PROPER PIZZA sees 29 + 34 = ~63 employees. The screenshot confirms this — 29 results shown are a mix.

## Why Previous Fixes Failed

- **`TO anon` only**: Broke kiosks with stale authenticated sessions
- **`TO anon, authenticated` + company check**: Broke kiosks when stale session is from a different company
- **`TO anon, authenticated` without company check**: Leaks employees to other companies on admin dashboard

The fundamental problem: **you cannot write a single permissive SELECT policy that correctly serves both kiosk pages and admin dashboards**.

## The Fix: SECURITY DEFINER RPC (matches existing kiosk architecture)

All other kiosk data (attendance, tasks, completions) already uses SECURITY DEFINER RPCs that validate the kiosk token. Employees is the **only** outlier using direct table access. We align it with the existing pattern:

### Step 1: Create `get_kiosk_employees` RPC

```sql
CREATE OR REPLACE FUNCTION public.get_kiosk_employees(
  p_token TEXT,
  p_location_id UUID
)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, role TEXT, user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate kiosk token (same pattern as get_kiosk_attendance_logs)
  IF NOT EXISTS (
    SELECT 1 FROM attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (k.device_token = p_token OR k.custom_slug = p_token)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.id, e.full_name, e.avatar_url, e.role, e.user_id
  FROM employees e
  WHERE e.location_id = p_location_id
    AND e.status = 'active'
  ORDER BY e.full_name;
END;
$$;
```

### Step 2: Drop the kiosk employees RLS policy

```sql
DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;
```

The remaining policies ("Users can view employees in their company", "Admins and managers can manage employees in their company", etc.) are all properly company-scoped.

### Step 3: Update 2 code locations to use the RPC

**`src/components/kiosk/KioskDashboard.tsx`** (line ~111):
```typescript
// Before: supabase.from("employees").select(...)
// After:
const { data, error } = await supabase.rpc("get_kiosk_employees", {
  p_token: kioskToken,
  p_location_id: locationId,
});
```

**`src/hooks/useStaffTodayTasks.ts`** (line ~731):
Same change — call the RPC instead of direct table query.

## Why This Is Safe

| Scenario | How it works |
|---|---|
| Kiosk device (anon or stale auth) | RPC validates token, bypasses RLS → employees returned |
| Admin dashboard (any company) | No kiosk policy exists → only company-scoped policy applies |
| Cross-company admin on kiosk URL | RPC validates token, returns data regardless of auth state |

This matches exactly how `get_kiosk_attendance_logs`, `get_kiosk_tasks`, and `get_kiosk_task_completions` already work. No new patterns introduced.

## What stays unchanged
- All admin/manager employee policies (company-scoped)
- All other kiosk RPCs (attendance, tasks, completions)
- Kiosk UI components (only the data-fetching call changes)
- All other tables and RLS policies

