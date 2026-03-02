

# Fix: Platform Admin Cannot Toggle Modules for Other Companies

## Root Cause
The RLS policy on `company_modules` restricts ALL operations (including upsert) to `company_id = get_user_company_id(auth.uid())`. When a platform admin (Fresh Brunch SRL) tries to toggle modules for PROPER PIZZA, the upsert is silently rejected by RLS because the target `company_id` doesn't match the admin's own company.

## Fix

### 1. Add RLS policy for platform admins
Create a new migration that adds an `ALL` policy on `company_modules` allowing users with the `admin` role in `user_roles` to manage modules for any company:

```sql
CREATE POLICY "Platform admins can manage all company modules"
  ON public.company_modules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

This uses the existing `has_role()` function which checks the `user_roles` table.

### 2. Also add SELECT policy for platform admins
The current SELECT policy also restricts to the admin's own company. Add:

```sql
CREATE POLICY "Platform admins can view all company modules"
  ON public.company_modules FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

### Files
- **Migration only** — no code changes needed. The `CompanyDetail.tsx` upsert logic is already correct; it's just blocked by RLS.

