

# Fix: RLS Error on `audit_field_responses` — Same Root Cause, Different Table

## What's happening

The error in the screenshot says: **"new row violates row-level security policy for table audit_field_responses"**. This is the **location audit flow** (`/location-audit` page), not the staff audit flow we fixed earlier. When the user clicks YES/NO on a checklist field, the `useSaveFieldResponse` hook fires an upsert into `audit_field_responses`.

The INSERT RLS policy on `audit_field_responses` requires:
1. `auth.uid() = created_by` — the hook sets this correctly
2. `location_audits.user_id = auth.uid() OR location_audits.assigned_user_id = auth.uid()` — this EXISTS check fails when the session token is stale

**Why it wasn't fixed before:** The previous session-refresh fix was only applied to `staff_audits`, `StaffStaffAudit`, `StaffPerformanceReview`, and `StaffLocationAudit` flows. The shared hooks `useSaveFieldResponse` and `useSaveSectionResponse` (used by the location audit page) were never updated with the refresh guard.

## Fixes

### 1. `src/hooks/useAuditFieldResponses.ts` — `useSaveFieldResponse` mutation
Add `refreshSession()` before `getUser()` in the mutation. If refresh fails, throw a clear error. Same pattern as the staff audit fix.

### 2. `src/hooks/useAuditFieldResponses.ts` — `useUploadFieldPhoto` and `useUploadFieldAttachment` mutations
Same fix: add `refreshSession()` guard before `getUser()`.

### 3. `src/hooks/useAuditSectionResponses.ts` — `useSaveSectionResponse` mutation
Same fix: add `refreshSession()` guard before `getUser()`. This hook has the identical pattern and the same RLS policy structure.

### 4. Error handling improvement
In the `onError` handlers of all four mutations, detect `row-level security` in the error message and show "Your session has expired. Please log in again." instead of the raw RLS error.

## What does NOT change
- No database or RLS policy changes
- No changes to `LocationAudit.tsx`, `PerformAudit.tsx`, or any page components
- No changes to auth context or routing

