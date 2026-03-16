

# Fix: `staff_audits` RLS error on StaffStaffAudit page

## Root Cause

The INSERT policy requires `auth.uid() = auditor_id`. The code sets `auditor_id: user.id` where `user` comes from the **cached** `useAuth()` React context. The RLS check uses `auth.uid()` from the **live JWT token**.

If there's any desync between the cached context and the live JWT (e.g., a background token refresh that updated the JWT but the React state hasn't re-rendered yet, or a brief race condition), the values mismatch and RLS blocks the insert. This can happen quickly — it's not about session expiry, it's about a momentary cache-vs-token desync.

The existing `useCreateStaffAudit` hook already does this correctly — it calls `await supabase.auth.getUser()` fresh before inserting. The `StaffStaffAudit.tsx` page doesn't use that hook; it has its own inline insert that uses the cached value.

## Fix — 2 files, code only, no database changes

### `StaffStaffAudit.tsx` — `handleSubmit` function (~line 268-295)

Replace the cached `user.id` with a fresh `supabase.auth.getUser()` call:

```typescript
// Instead of using cached user.id from context:
const { data: { user: freshUser } } = await supabase.auth.getUser();
if (!freshUser) {
  toast.error("Session expired. Please log in again.");
  navigate("/auth");
  return;
}

// Use freshUser.id for auditor_id
auditor_id: freshUser.id,
```

Also add a console.log before the insert so if it ever fails again, we have diagnostic data.

### `StaffPerformanceReview.tsx` — same pattern (~line 155-175)

Apply the identical fix: fresh `getUser()` call before the `staff_audits` insert.

## What this changes
- **StaffStaffAudit.tsx** — fresh auth check before insert (lines 268-295)
- **StaffPerformanceReview.tsx** — same fix (lines 155-175)

## What this does NOT change
- No database/RLS policy changes
- No changes to any other page or flow
- No changes to the auth context, session handling, or any other insert operations
- The `useCreateStaffAudit` hook is already correct and untouched

## Risk: Zero
- The fresh `getUser()` call is a lightweight API call that Supabase recommends for server-validated operations
- If the user IS authenticated (normal case), behavior is identical — just uses a guaranteed-fresh ID
- If the user somehow ISN'T authenticated, they get a clear redirect instead of a cryptic RLS error

