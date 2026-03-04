

# Tests — Cross-Company Data Leak

## Root Cause

The RLS policy `"Anyone can view active tests"` on the `tests` table uses `USING (is_active = true)` with no `company_id` check, applied to `{public}` (all roles). This means every authenticated user sees every active test from every company.

There is already a correct policy `"Users can view active tests in their company"` that scopes by company — but because RLS policies are OR'd together, the permissive "anyone" policy overrides it entirely.

## Fix

Drop the overly permissive policy. The company-scoped policy already covers authenticated users. If public/anon access is needed (e.g., for take-test links), scope it to `anon` only:

```sql
DROP POLICY "Anyone can view active tests" ON tests;

CREATE POLICY "Anon can view active tests by link"
ON tests FOR SELECT TO anon
USING (is_active = true);
```

No code changes needed — the existing company-scoped policy handles authenticated users correctly once the permissive policy is removed.

