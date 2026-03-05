

# Fix: Company Owners Get Full Management Access

## Why not just give owners "admin" access?

Because `has_role('admin')` is used in two different contexts:

1. **Operational tables** (locations, employees, shifts, etc.) — policies check `has_role('admin') OR has_role('manager')`. These are what company owners need.
2. **Platform-only tables** — policies check `has_role('admin')` ALONE. These 18 policies protect:
   - `modules`, `industries`, `module_industries`, `company_modules` (platform config)
   - `scout_*` tables (mystery shopper system — 10 tables)
   - `notification_templates` (global templates)
   - `user_roles` (platform role assignments)

If we make owners pass the `admin` check, they'd gain access to ALL of the above — managing other companies' modules, editing platform scout templates, assigning platform roles. That's the exact escalation we just fixed.

## The right approach: owners pass the `manager` check

Every operational policy uses `has_role('admin') OR has_role('manager')`. By making company owners implicitly pass the `manager` check, they get full management of their company data while platform-only tables stay locked.

## Change: One function update

Update `has_role()` so that when checking for `manager`, it also returns `true` if the user is a `company_owner` or `company_admin` in `company_users`:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  OR (
    _role = 'manager'::app_role
    AND EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id
        AND company_role IN ('company_owner', 'company_admin')
    )
  )
$$;
```

This single change instantly unblocks ~40+ tables for company owners. No policy rewrites, no frontend changes. Data isolation is maintained because every operational policy also checks `company_id`.

