

# Fix QR Form: Duplicate Insert Error + Missing Historical Data

## Two Bugs, One Root Cause Each

### Bug 1: "duplicate key value violates unique constraint idx_form_submissions_unique_period"

**What happens:** When a user opens the form on day 4, the code fetches the existing submission (created on day 1). However, there's a race condition: the `existingSubmission` query result hasn't loaded yet when the user saves, OR the RLS policy blocks the SELECT so the code thinks there's no existing record and tries to INSERT a new one — hitting the unique index.

**Root cause in code** (`QrFormEntry.tsx` line 178): The save mutation re-queries for the freshest record (`freshExisting`). But if RLS blocks the user from seeing submissions created by *other users*, `freshExisting` comes back null, and the code falls into the INSERT branch (line 224) instead of the UPDATE branch — violating the unique constraint.

**Fix:** Replace the INSERT with an UPSERT (`ON CONFLICT ... DO UPDATE`) so that even if the SELECT missed the existing row, the write still succeeds as an update. This is the only bulletproof solution given concurrent multi-user access.

### Bug 2: Users don't see data from previous days / other users

**What happens:** Data entered on day 1 and day 3 (visible in the screenshot) should be visible when another user opens the form on day 4. Currently, the user only sees their own input because:

1. The `existingSubmission` query fetches from `form_submissions` using the authenticated user's session
2. If the RLS policy on `form_submissions` restricts SELECT to `submitted_by = auth.uid()`, then user B can't see what user A entered
3. Even if RLS allows it, line 455 (`isDayDisabled = isLocked || day !== todayDay`) makes past days read-only but still shows the data — so if data loads, it should display. The issue is the data never loads because of RLS.

**Fix:** The RLS SELECT policy for `form_submissions` needs to allow any authenticated user in the same company to read submissions (not just the submitter). This is correct behavior — the form is a shared monthly log, not personal data.

## Technical Plan

### 1. Update save logic to use UPSERT (QrFormEntry.tsx)

Replace the INSERT branch with a Supabase `.upsert()` call that uses `onConflict: 'location_form_template_id,period_year,period_month'` for monthly_grid forms. This way:
- If no row exists → INSERT
- If a row already exists (created by another user) → UPDATE with deep-merged data
- No more unique constraint violations

### 2. Fix RLS on form_submissions for shared visibility

Check and update the SELECT policy so that all company members can read form submissions for their company. The form is a shared compliance document — everyone needs to see all entries.

### 3. Keep deep-merge logic intact

The existing merge logic (lines 181-203) is correct and should remain — it preserves data from other users/days when saving.

### Files to modify
- `src/pages/qr-forms/QrFormEntry.tsx` — replace INSERT with UPSERT for monthly_grid forms
- Database migration — update RLS SELECT policy on `form_submissions` if it restricts by `submitted_by`

