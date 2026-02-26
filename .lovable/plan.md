

# Recap: All Fixes to Implement

---

## Fix 1: Sign-up Role Assignment (P0)

**Problem:** `Auth.tsx` lines 168-211 make 3 separate client-side inserts (companies, company_users, user_roles) that fail silently because RLS blocks a brand-new user from inserting into those tables.

**Fix:** Replace all 3 inserts with a single call to the existing `create_company_onboarding` RPC, which is `SECURITY DEFINER` and handles everything atomically -- company creation, user linking as `company_owner`, and module setup.

**File:** `src/pages/Auth.tsx` (lines 168-211)

---

## Fix 2: `app_secrets` RLS (P0)

**Problem:** Table has RLS enabled with zero policies, blocking all access.

**Fix:** No code change needed. This is correct by design -- only the service role (edge functions) should access it. The table is already properly locked down. No action required.

---

## Fix 3: Make `documents` Bucket Private (P1)

**Problem:** The `documents` bucket is `public: true`, meaning anyone with the file path URL can access sensitive documents without authentication.

**Fix:** Migration to set `public = false`. The existing SELECT policy already handles authenticated access via signed URLs.

**Note:** `equipment-documents` stays public per your instruction.

---

## Fix 4: Fix `performance_monthly_scores` Cross-Tenant Policy (P1)

**Problem:** An `ALL` policy with `USING(true)` and `WITH CHECK(true)` allows any authenticated user to read/write/delete scores across all companies.

**Fix:** Drop the `"Service role can manage monthly scores"` ALL policy. The edge function that writes scores uses the service role which bypasses RLS entirely, so it doesn't need this policy. The 3 existing SELECT policies (own scores, same-location, managers) already handle read access correctly.

---

## Fix 5: Scope Storage INSERT/SELECT/DELETE Policies (P1)

**Problem:** All 6 storage policies for `documents` and `equipment-documents` allow any authenticated user to upload/view/delete files in any company's folder. No company scoping.

**Fix:** Drop all 6 existing policies and recreate them with company-folder scoping using `get_user_company_id(auth.uid())`:
- INSERT: `WITH CHECK` includes `(storage.foldername(name))[1] = get_user_company_id(auth.uid())::text`
- SELECT: `USING` includes the same company folder check
- DELETE: `USING` scoped to company folder + restricted to managers/admins

---

## Fix 6: Tasks Routes Use ManagerRoute (P2)

**Problem:** `/tasks`, `/tasks/new`, `/tasks/:id/edit`, `/tasks/calendar` use `ProtectedRoute`, allowing staff to load management forms (though RLS blocks saves).

**Fix:** Change all 4 routes to `<ManagerRoute requiredPermission="manage_audits">`. This does NOT affect staff task completion -- staff use `/staff/tasks` which remains unchanged.

**File:** `src/App.tsx` (lines 386-389)

---

## Fix 7: Multi-Company Edge Case in useUserRole (P2)

**Problem:** `useUserRole.ts` line 24-28 queries `company_users` with `.maybeSingle()` but no ordering. If a user belongs to multiple companies, this throws an error instead of returning a result.

**Fix:** Add `.order('created_at', { ascending: false }).limit(1)` before `.maybeSingle()` to match the same logic used by the `get_user_company_id` database function.

**File:** `src/hooks/useUserRole.ts` (lines 24-28)

---

## Summary of Changes

| # | What | Type | Files |
|---|------|------|-------|
| 1 | Sign-up uses RPC | Code | `Auth.tsx` |
| 2 | app_secrets | No change | -- |
| 3 | documents bucket private | Migration | SQL |
| 4 | Drop dangerous ALL policy | Migration | SQL |
| 5 | Scope storage policies | Migration | SQL |
| 6 | Tasks routes ManagerRoute | Code | `App.tsx` |
| 7 | Multi-company useUserRole | Code | `useUserRole.ts` |

Total: 1 migration (fixes 3+4+5) + 3 code file edits (fixes 1+6+7)

