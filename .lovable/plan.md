

# Fix: Tests Visible Across Companies (Cross-Tenant Data Leak)

## Root Cause

Two compounding issues in the `tests` table:

### Issue 1: RLS policy has no company filter

The policy **"Admins and managers can manage tests"** grants full CRUD to anyone with an admin/manager role — across ALL companies:

```sql
-- CURRENT (INSECURE)
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR has_company_role(auth.uid(), 'company_admin')
  OR has_company_role(auth.uid(), 'company_owner')
)
```

The `has_company_role` function also lacks company scoping — it checks if the user has that role in ANY company, not their current one:

```sql
-- has_company_role implementation (no company_id filter!)
SELECT EXISTS (
  SELECT 1 FROM company_users
  WHERE user_id = _user_id AND company_role = _role
)
```

Result: Daniel (PROPER PIZZA owner) matches `has_company_role('company_owner')` → sees ALL tests from ALL companies.

### Issue 2: All existing tests have `company_id = NULL`

The `company_id` column is nullable and was never populated. Even if we fix the RLS, the existing `company_id`-based SELECT policy also fails because it checks `company_id IN (user's companies)` and NULL doesn't match anything — so the company-scoped policy never matches these tests either. The role-based policy (without company filter) is the only one that returns rows.

### Issue 3: `test_submissions` has the same problem

The policies "Admins and managers can view all submissions" and "Employees can view their own submissions" both use `has_role()` without company scoping.

## The Fix

### Database Migration (single migration, 3 parts)

**Part A**: Backfill `company_id` on existing tests using the `created_by` user's company:

```sql
UPDATE tests SET company_id = get_user_company_id(created_by)
WHERE company_id IS NULL;

ALTER TABLE tests ALTER COLUMN company_id SET NOT NULL;
```

**Part B**: Replace the role-only RLS policy with a company-scoped one:

```sql
DROP POLICY "Admins and managers can manage tests" ON tests;

CREATE POLICY "Company managers can manage their tests"
ON tests FOR ALL TO authenticated
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));
```

This replaces the role-only check with a company-scoped check. Any authenticated user in the company can manage tests (the role gating happens at the UI/code level already).

**Part C**: Fix `test_submissions` SELECT policies to add company scoping:

```sql
DROP POLICY "Admins and managers can view all submissions" ON test_submissions;

CREATE POLICY "Users can view submissions in their company"
ON test_submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tests t
    WHERE t.id = test_submissions.test_id
    AND t.company_id = get_user_company_id(auth.uid())
  )
);
```

### No Code Changes Needed

The existing queries in `TestManagement.tsx`, `TestCreation.tsx`, `TestEdit.tsx` don't filter by `company_id` client-side — they rely on RLS. Once RLS is fixed, the correct data will be returned automatically.

The only code change: ensure `TestCreation.tsx` and `TestEdit.tsx` set `company_id` when inserting/updating tests (need to verify this).

## Impact

| Before | After |
|---|---|
| PROPER PIZZA sees 9 tests from Fresh Brunch | PROPER PIZZA sees 0 tests (correct) |
| Fresh Brunch tests unchanged | Fresh Brunch tests unchanged |
| New companies see other companies' tests | New companies start clean |

