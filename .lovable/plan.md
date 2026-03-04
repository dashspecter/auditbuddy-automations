

# End-to-End Fix: QR Form Data Visibility & Save Integrity

## What I Found

After a thorough audit of the entire flow (RLS policies, query logic, save mutation, upsert branch), here's the status:

### Already Fixed (Working)
- **SELECT RLS policy** on `form_submissions` — correctly includes `employees` UNION. Staff can read all company submissions. Verified in the live database.
- **UPDATE RLS policy** — same fix applied. Staff can update shared forms.
- **Deep-merge on save** (primary branch) — when the re-query finds the existing submission, data from other users/days is preserved correctly.

### Still Broken — 2 Issues

**Issue 1: Upsert branch has no deep-merge (data loss risk)**

Lines 224-260 in `QrFormEntry.tsx`: When the `freshExisting` re-query returns null (transient network issue, brief RLS cache miss, or any edge case), the code falls to the upsert branch. This branch writes `formData` (only the user's local `gridData`) without merging the existing DB data. If the user only entered today's values, days 1-3 data gets **overwritten with empty**.

The fix: Move the entire save logic into a `SECURITY DEFINER` database function (`upsert_form_submission`) that:
- Fetches the existing row (bypassing RLS)
- Deep-merges the new grid data with the existing grid data at the SQL/JSONB level
- Performs a single INSERT ON CONFLICT UPDATE with the merged result
- Eliminates all client-side race conditions

**Issue 2: INSERT policy has a security bug**

The INSERT policy on `form_submissions` contains `e.company_id = e.company_id` (self-referential — always true). This means any authenticated user with an employee record in ANY company can insert into form_submissions with ANY company_id. Must fix to `e.company_id = company_id` (referencing the new row's column).

## Implementation Plan

### 1. Create `upsert_form_submission` database function

A `SECURITY DEFINER` function that accepts (location_form_template_id, template_id, template_version_id, company_id, location_id, period_year, period_month, new_data JSONB, submitted_by UUID, final_submit BOOLEAN). Internally it:
- SELECTs the existing row (if any) using the unique index columns
- Deep-merges at JSONB level: `existing_data->'grid' || new_data->'grid'` with per-day, per-time granularity
- Uses INSERT ... ON CONFLICT DO UPDATE with the merged data
- Returns the submission ID and status

### 2. Fix INSERT RLS policy

```sql
DROP POLICY "Staff can create submissions" ON form_submissions;
CREATE POLICY "Staff can create submissions" ON form_submissions FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
    UNION
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);
```

### 3. Simplify `QrFormEntry.tsx` save mutation

Replace the entire dual-branch save logic (re-query → merge → update OR upsert) with a single RPC call to `upsert_form_submission`. This eliminates:
- The `freshExisting` re-query
- Client-side deep-merge logic
- The upsert-without-merge branch
- All race conditions between concurrent users

### Files to modify
- **Database migration** — create `upsert_form_submission` function + fix INSERT policy
- **`src/pages/qr-forms/QrFormEntry.tsx`** — replace save mutation with single RPC call

