

## Fix Employee Roles RLS Policies for Manager Access

### Problem
The `employee_roles` table write policies only allow `company_owner` and `company_admin` company roles. Users like Vlad who have the `manager` app_role but `company_member` company_role are blocked from creating, updating, or deleting employee roles.

### Fix
Replace the three restrictive write policies with ones that use the existing `user_is_manager_in_company()` helper function, which correctly handles all authorized roles.

### Database Migration

```sql
DROP POLICY "Admins and owners can create roles" ON public.employee_roles;
DROP POLICY "Admins and owners can update roles" ON public.employee_roles;
DROP POLICY "Admins and owners can delete roles" ON public.employee_roles;

CREATE POLICY "Managers can create roles"
  ON public.employee_roles FOR INSERT
  WITH CHECK (user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Managers can update roles"
  ON public.employee_roles FOR UPDATE
  USING (user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Managers can delete roles"
  ON public.employee_roles FOR DELETE
  USING (user_is_manager_in_company(auth.uid(), company_id));
```

### Why This Works Long-Term
- `user_is_manager_in_company()` already handles company_owner, company_admin, company_member + platform admin/manager roles
- Single function to update if role logic ever changes
- Consistent with how `badge_configurations` and other tables are already secured

### Files
- **New migration SQL file** -- 6 statements (3 drops + 3 creates)
- No application code changes needed

