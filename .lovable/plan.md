

# Fix: QR Form Duplicate Submissions & Missing Data

## Problem

The data submitted on March 1 for LBFC Amzei **exists in the database** but is hidden by a newer empty duplicate record. This is a systemic issue affecting 9+ forms across multiple locations. When different staff members scan the same QR code at different times, the code sometimes creates a **new** submission instead of updating the existing one (race condition: the `existingSubmission` query hasn't loaded yet when the save fires). The UI then loads the newest record (`ORDER BY created_at DESC LIMIT 1`), which may be empty, hiding the real data.

## Fix Plan (3 steps)

### Step 1: Data Cleanup — Merge & deduplicate existing records

SQL migration that:
- For each `(location_form_template_id, period_year, period_month)` with duplicates, **deep-merge** all grid data into the oldest record (preserving all checkpoint entries from all users)
- Delete the duplicate rows after merging
- This restores yesterday's data immediately

### Step 2: Add unique constraint to prevent future duplicates

```sql
CREATE UNIQUE INDEX idx_form_submissions_unique_period 
ON form_submissions (location_form_template_id, period_year, period_month) 
WHERE period_year IS NOT NULL AND period_month IS NOT NULL;
```

### Step 3: Fix `QrFormEntry.tsx` submission logic

Replace the INSERT path with a **fresh query + upsert** approach:
- Before saving, always re-query the database for an existing submission (don't rely on the cached `existingSubmission` which may be stale)
- If found: deep-merge and UPDATE
- If not found: INSERT
- This eliminates the race condition entirely

Also fix the `existingSubmission` query to not just pick the newest by `created_at` but to prefer records with actual data.

### Step 4: Fix the edge function `qr-form-public-view`

The public inspector view also uses `.order("updated_at", { ascending: false }).limit(10)` — this works correctly since it returns multiple submissions, but should be verified to show merged data after cleanup.

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Merge duplicate submissions, delete empties, add unique partial index |
| `src/pages/qr-forms/QrFormEntry.tsx` | Re-query before save to prevent race condition; use fresh DB state for merge |

## What Does NOT Change
- Form template schema, overrides, checkpoints
- QR code scanning flow
- Public inspector view (edge function)
- Dashboard/kiosk/staff views
- RLS policies

## Verification
1. Check that LBFC Amzei form now shows Day 1 and Day 2 data
2. Have two users save the same form concurrently — no duplicates created
3. Verify all other affected forms show merged data correctly

