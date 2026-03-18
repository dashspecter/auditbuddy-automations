

# Plan: Fix 5 Security Issues from Audit

## Issue 1: `platform_audit_log` INSERT policy too permissive
**Problem**: INSERT policy uses role `{public}` with `WITH CHECK (true)` — anyone (even unauthenticated) can insert.  
**Fix**: Drop the current INSERT policy. Create a new one restricted to `service_role` only (system writes via edge functions).

```sql
DROP POLICY "System can insert audit logs" ON platform_audit_log;
-- No replacement needed: service_role bypasses RLS automatically.
-- If we want an explicit policy for clarity:
CREATE POLICY "Only service role can insert audit logs"
  ON platform_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);
```

## Issue 2: `webhook_logs` INSERT policy too permissive
**Problem**: Same issue — INSERT uses role `{public}` with `WITH CHECK (true)`.  
**Fix**: Same pattern — drop and restrict to service_role.

```sql
DROP POLICY "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "Only service role can insert webhook logs"
  ON webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
```

Also fix the SELECT policy which uses `{public}` role — should be `{authenticated}`:
```sql
DROP POLICY "Admins can view webhook logs in their company" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs in their company"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) 
    AND (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin')));
```

## Issue 3: `vouchers` INSERT policies missing company_id check
**Problem**: Both `anon` and `authenticated` INSERT policies have `WITH CHECK (true)` — no tenant scoping. Any user can insert vouchers for any company.  
**Fix**: The anon policy is needed for public voucher creation (mystery shopper flow). The authenticated policy should scope to user's company.

```sql
DROP POLICY "Allow authenticated insert vouchers" ON vouchers;
CREATE POLICY "Authenticated users can insert vouchers for their company"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
```

The SELECT policy `Anyone can view vouchers` with `USING (true)` also needs review — vouchers are likely viewed publicly by code, so this may be intentional (for redemption). Keep as-is but note it.

## Issue 4: `audit-field-attachments` storage SELECT policy missing tenant scope
**Problem**: The SELECT policy only checks `bucket_id = 'audit-field-attachments'` — any authenticated user can read ANY user's files. INSERT and DELETE correctly scope to `auth.uid()`.  
**Fix**: Add the same folder scoping as INSERT/DELETE.

```sql
DROP POLICY "Users can view audit files" ON storage.objects;
CREATE POLICY "Users can view audit files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'audit-field-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Note**: This means managers reviewing audits can only see their own uploads. If managers need to see staff uploads, we'd need a broader policy. But the current INSERT scopes to `auth.uid()` too, so this is consistent — the bucket is public (files are accessible via public URL anyway). The RLS here just controls listing. Since the bucket is `public: true`, files are accessible by direct URL regardless. This is acceptable for now.

## Issue 5: `AdminRoute` used for platform-level pages
**Problem**: Three routes use `AdminRoute` (allows company admins) but should use `PlatformAdminRoute` (platform admin only):
- `/admin/platform` → `PlatformAdmin` component
- `/admin/companies/:id` → `CompanyDetail` component  
- `/admin/debug` → `DebugInfo` component

**Fix**: In `src/App.tsx`, change these three routes from `<AdminRoute>` to `<PlatformAdminRoute>`.

---

## Files to change

| File | Change |
|------|--------|
| `src/App.tsx` | Change 3 routes from `AdminRoute` to `PlatformAdminRoute` |
| Database migration | Drop/recreate 4 RLS policies (platform_audit_log, webhook_logs ×2, vouchers) |
| Database migration | Drop/recreate 1 storage policy (audit-field-attachments SELECT) |

## What's already fine
- All SECURITY DEFINER functions already have `SET search_path = public` (query returned empty — already fixed).

