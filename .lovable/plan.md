
Problem found (deep-dive result):
- The kiosk is not empty because `get_kiosk_employees` failed. It is returning data correctly.
- The break happens in this request: `GET /employee_roles?department_id=...` (returns `[]` for anon kiosk).
- Then `KioskDashboard` applies department filter with `departmentRoleNames=[]`, which filters all employees out:
  - `employees = allEmployees.filter(e => departmentRoleNames.includes(e.role))` → empty
  - `todaysTeam` becomes 0
  - tasks are forced to empty (`if (todaysTeam.length === 0) return []`)
  - KPI/cards/champions all collapse to zero.

Why this started after the last fixes:
- Current kiosk employee_roles RLS policy depends on a subquery against `employees`.
- We removed the kiosk SELECT policy on `employees` (moved to RPC for security isolation).
- So anon kiosk can no longer satisfy that subquery, and employee_roles visibility collapses to zero.
- This is a hidden RLS dependency between tables.

Implementation plan (surgical, low blast radius):
1) Add a dedicated kiosk RPC for department role names
- New DB function: `public.get_kiosk_department_role_names(p_token text, p_location_id uuid, p_department_id uuid)`
- SECURITY DEFINER, validates active kiosk by `(device_token OR custom_slug)` + location match.
- Returns role names from `employee_roles` for that `department_id` and matching company.
- Grant EXECUTE to `anon` and `authenticated`.
- `NOTIFY pgrst, 'reload schema'`.

2) Update kiosk UI to use RPC instead of direct `employee_roles` table select
- File: `src/components/kiosk/KioskDashboard.tsx`
- Replace:
  - `.from("employee_roles").select("name").eq("department_id", departmentId)`
- With:
  - `supabase.rpc("get_kiosk_department_role_names", { p_token: kioskToken, p_location_id: locationId, p_department_id: departmentId })`
- Keep existing filtering behavior unchanged (so department scoping remains exact).

3) Keep all existing employee/task/completion kiosk flows unchanged
- No changes to:
  - `get_kiosk_employees`
  - `get_kiosk_tasks`
  - `get_kiosk_task_completions`
  - admin/company RLS policies.
- This avoids reopening cross-company leakage risk.

4) Verification checklist (must run end-to-end)
- Fresh Brunch kiosk URL (affected one):
  - confirm role query returns non-empty via new RPC
  - `Today’s Team` > 0 when scheduled
  - tasks list appears
  - champions/MTD cards populate as expected
- PROPER PIZZA admin:
  - employee list remains company-isolated (no Fresh Brunch rows)
- Regression smoke:
  - another kiosk token (different location/department) still works
  - uppercase/lowercase kiosk URL still works.

Technical notes:
- This fix removes reliance on fragile cross-table RLS chaining (employee_roles policy depending on employees visibility).
- It preserves your security direction: public kiosk reads are token-validated through server-side functions, while admin dashboards stay company-scoped by RLS.
- Expected file changes:
  - one migration SQL (new RPC + grants + notify)
  - one frontend file (`KioskDashboard.tsx`) query swap only.
