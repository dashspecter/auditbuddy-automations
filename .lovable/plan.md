

# Rename "User Limit" to "Employee Limit" and Enforce on Employee Creation

## Problem
The current `max_users` limit checks against `company_users` (platform login accounts), but the business intent is to limit **employees** (the workforce records added via Staff page). These are different concepts — a company might have 5 platform users but 65 employees.

## Changes

### 1. Database Migration
Rename column for clarity:
```sql
ALTER TABLE public.companies RENAME COLUMN max_users TO max_employees;
```

### 2. Platform Admin UI — `CompanyDetail.tsx`
- Rename "User Limit" card to "Employee Limit"
- Change the current usage to show employee count (from the overview RPC `employees_count`) instead of `company_users` count
- Update all labels: "Max users" → "Max employees", etc.
- Update the column reference from `max_users` to `max_employees`

### 3. Enforce on Employee Creation — `useCreateEmployee` in `src/hooks/useEmployees.ts`
Before inserting, check the company's `max_employees` and current employee count:
- Query `companies.max_employees` for the user's company
- Query `employees` count for that company
- If at/over limit, throw an error with a clear message
- This blocks the insert client-side with a toast

### 4. Server-Side Enforcement via Database Trigger
Create a trigger on the `employees` table that checks `max_employees` before INSERT:
```sql
CREATE FUNCTION check_employee_limit() RETURNS trigger ...
-- Compare current count vs companies.max_employees
-- RAISE EXCEPTION if exceeded
```
This is the bulletproof server-side enforcement.

### 5. Update Company Settings — `CompanySettings.tsx`
- Remove the `max_users` invite-blocking logic (the limit no longer applies to platform user invites)
- Remove the usage badge from the "Company Users" card header
- Remove the disabled state on the Invite button tied to `max_users`

### 6. Update Edge Function — `create-user/index.ts`
- Remove the `max_users` check that blocks user invites — inviting platform users should not be limited by employee count

### 7. Staff Page — Visual Indicator
In `src/pages/workforce/Staff.tsx`, show an "X / Y employees" badge when a limit is set, and disable the "Add Staff" button when at capacity.

## Files to Change
- **Migration**: Rename column + create trigger
- `src/pages/admin/CompanyDetail.tsx` — rename labels, use employee count
- `src/hooks/useEmployees.ts` — client-side limit check before insert
- `src/pages/CompanySettings.tsx` — remove user limit logic
- `supabase/functions/create-user/index.ts` — remove user limit check
- `src/pages/workforce/Staff.tsx` — show capacity indicator + disable add button

