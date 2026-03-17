

# Root Cause Found: Missing `company_id` in `useCreateStaffAudit` hook

## The real problem

The session refresh guard is working correctly — Vlad's session IS valid. The RLS failure happens **after** the INSERT succeeds, when the `.select().single()` runs.

Here's the chain:

1. `useCreateStaffAudit` hook inserts into `staff_audits` with `auditor_id: user.id` but **no `company_id`**
2. The INSERT policy (`auth.uid() = auditor_id`) passes — row is created with `company_id = NULL`
3. The `.select().single()` then tries to read back the row
4. The SELECT policy requires `company_id = get_user_company_id(auth.uid())` — but `NULL ≠ uuid`, so it evaluates to FALSE
5. RLS blocks the SELECT → error: "new row violates row-level security policy"

This affects the **manager-facing** audit page (`StaffAuditNew.tsx` at `/staff-audits/new`), which calls `useCreateStaffAudit`. The staff mobile page (`StaffStaffAudit.tsx`) works fine because it includes `company_id` and doesn't use `.select()`.

The screenshot confirms this: two error toasts appear — one from the hook's `onError` ("Your session has expired") and one from `StaffAuditNew.tsx`'s catch block (the raw RLS message). This double-toast only happens in the `StaffAuditNew` flow.

## Why the session guard didn't fix it

The session IS valid. `refreshSession()` succeeds. `getUser()` returns the correct user. `auth.uid()` is populated. The INSERT itself passes. It's the **post-insert SELECT** that fails because of the missing `company_id`.

## Fixes needed

### 1. `src/hooks/useStaffAudits.ts` — add `company_id` lookup

Before the insert, query the employee's `company_id` (same pattern used in `StaffStaffAudit.tsx`):

```typescript
const { data: empData } = await supabase
  .from("employees")
  .select("company_id")
  .eq("user_id", user.id)
  .single();

if (!empData) throw new Error("Employee record not found");

const { data, error } = await supabase
  .from("staff_audits")
  .insert({ ...audit, auditor_id: user.id, company_id: empData.company_id })
  .select()
  .single();
```

### 2. `src/pages/StaffAuditNew.tsx` — fix double toast

The `handleSubmit` catch block shows the raw error message even though the hook's `onError` already shows a user-friendly toast. Remove the redundant `toast.error(error.message)`:

```typescript
} catch (error: any) {
  console.error('Error submitting audit:', error);
  // Don't show raw error - the hook's onError already handles it
}
```

### 3. `src/contexts/AuthContext.tsx` — fix `handleInactivityLogout`

Currently uses `supabase.auth.signOut()` without `scope: 'local'`. If the server session is already expired, this can throw a 403. Change to match the resilient pattern:

```typescript
const handleInactivityLogout = async () => {
  await supabase.auth.signOut({ scope: 'local' });
  // ...
};
```

## What does NOT change
- No database schema or RLS policy changes needed
- No changes to `StaffStaffAudit.tsx`, `StaffLocationAudit.tsx`, or `StaffPerformanceReview.tsx` (those work correctly)
- The session refresh guard stays in place (still valuable for edge cases)

