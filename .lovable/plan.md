

# Implementation Plan: Session Refresh Guard for All Audit Submissions

## Summary
Add `refreshSession()` before every database write to `staff_audits` and `location_audits`, detect RLS errors with clear messaging, and backfill null `company_id` on old records.

## Changes

### 1. `src/hooks/useStaffAudits.ts` (useCreateStaffAudit hook)
- Add `supabase.auth.refreshSession()` before `getUser()` in the mutation
- If refresh fails, throw `"SESSION_EXPIRED"` error
- In `onError`, detect `SESSION_EXPIRED` or `row-level security` and show "Your session has expired" message

### 2. `src/pages/staff/StaffStaffAudit.tsx` (handleSubmit)
- Add `refreshSession()` call before the existing `getUser()` call (~line 268)
- If refresh fails, redirect to `/auth`
- In catch block, detect `row-level security` error and redirect to `/auth` with clear message

### 3. `src/pages/staff/StaffPerformanceReview.tsx` (handleSubmit)
- Same pattern: add `refreshSession()` before `getUser()` (~line 156)
- Same RLS error detection in catch block

### 4. `src/pages/staff/StaffLocationAudit.tsx` — TWO functions

**saveDraft (~line 306):**
- Add `refreshSession()` + `getUser()` guard at the start
- Replace `user.id` with `freshUser.id` in the payload and employee query
- Add RLS error detection in catch block

**attemptSubmit (~line 457):**
- Add `refreshSession()` + `getUser()` guard at the start
- Replace `user.id` with `freshUser.id` in the payload and employee query
- Add RLS error detection in the outer catch block (~line 519)

### 5. Data repair — backfill null `company_id`
Run via insert tool:
```sql
UPDATE public.staff_audits sa
SET company_id = e.company_id
FROM public.employees e
WHERE sa.employee_id = e.id
  AND sa.company_id IS NULL
  AND e.company_id IS NOT NULL;
```

## Pattern applied to all 5 paths
```typescript
// Force token refresh to ensure JWT is valid
const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
if (refreshError || !session) {
  toast.error("Your session has expired. Please log in again.");
  navigate("/auth");
  return;
}
const { data: { user: freshUser } } = await supabase.auth.getUser();
if (!freshUser) {
  toast.error("Session expired. Please log in again.");
  navigate("/auth");
  return;
}
// Use freshUser.id for auditor_id / user_id
```

And in every catch block:
```typescript
} catch (error: any) {
  if (error?.message?.includes("row-level security")) {
    toast.error("Your session has expired. Please log in again.");
    navigate("/auth");
  } else {
    // existing error handling
  }
}
```

## What does NOT change
- No database schema or RLS policy changes
- No changes to AuthContext, ProtectedRoute, or session timeout
- No changes to any other pages or components
- No changes to edge functions or triggers

