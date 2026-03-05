
# COMPLETED: Kiosk Employee Data Isolation via SECURITY DEFINER RPC

## What was done

1. **Created `get_kiosk_employees` RPC** — SECURITY DEFINER function that validates the kiosk token/slug, then returns active employees at that location. Bypasses RLS entirely (same pattern as `get_kiosk_attendance_logs`, `get_kiosk_tasks`, `get_kiosk_task_completions`).

2. **Dropped the leaky `"Kiosk can view employees at its location"` RLS policy** — This was the root cause of cross-tenant data leaks. With it gone, the only remaining SELECT policy on `employees` is the company-scoped one.

3. **Updated 2 code locations** to call `supabase.rpc("get_kiosk_employees", ...)` instead of `supabase.from("employees").select(...)`:
   - `src/components/kiosk/KioskDashboard.tsx` (line ~108)
   - `src/hooks/useStaffTodayTasks.ts` (line ~728)

## Result
- PROPER PIZZA admin dashboard → sees only PROPER PIZZA employees (company-scoped RLS)
- Fresh Brunch kiosk → sees Fresh Brunch employees (RPC validates token, bypasses RLS)
- Cross-company user on kiosk URL → RPC validates token, works regardless of auth state
