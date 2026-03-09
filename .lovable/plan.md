

# Fix: HR Role Cannot See Payroll History

## Root Cause

The RLS policy on `payroll_periods` only grants access to users with these roles:
- `admin` (platform)
- `manager` (platform)
- `company_owner`
- `company_admin`

The **`hr` role is missing** from this policy. Since Sonia has the HR role, the database returns zero rows — hence the empty "Payroll History" page.

The same issue likely applies to the `payroll_items` table (used for batch details).

## The Fix

**One database migration** to update RLS policies on both payroll tables to include the `hr` role.

### SQL

```sql
-- payroll_periods: drop + recreate with hr
DROP POLICY "Company admins can manage payroll periods" ON public.payroll_periods;

CREATE POLICY "Company roles can manage payroll periods"
ON public.payroll_periods FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'hr') OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'hr') OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin')
  )
);
```

Same pattern for `payroll_items` if its policy also excludes `hr`.

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Add `hr` role to RLS policies on `payroll_periods` and `payroll_items` |

No code changes needed — the query and UI already work; the database just blocks HR users from seeing the data.

