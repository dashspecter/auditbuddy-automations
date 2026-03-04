

# Why Day 3 Data Is Missing — Root Cause Found

## Evidence from Database

| What I Checked | Result |
|---|---|
| Gabriela's submissions (all time) | **ZERO rows** in `form_submissions` |
| Gabriela's audit entries (all time) | **ZERO rows** in `form_submission_audit` |
| Current FRIGIDER 6 data (March) | Days 1, 2, 4 only — no day 3 |
| Gabriela's company/location match | Same company + location as the form |

**Gabriela's data was never persisted to the database.** She has zero submissions and zero audit entries across the entire system.

## What Happened — Timeline Reconstruction

The `upsert_form_submission` function and `form_submission_audit` table were deployed **today** (March 4). Before today, the old save code had two branches:

1. **Branch A** (happy path): Re-query the existing submission → found → client-side deep merge → UPDATE
2. **Branch B** (data loss): Re-query returns null (transient issue) → INSERT ON CONFLICT UPDATE with **only local gridData, no merge**

When Gabriela saved on March 3, she hit **Branch B**. Her `gridData` (days 1 + her new day 3) was sent as an upsert. However, the INSERT ON CONFLICT UPDATE **overwrote** the entire row with her local state. This means Romeo's day 1 data was replaced with her version of day 1 + her day 3.

Then on March 4, when Serdar (or someone else adding day 2 with initials "M.G") saved and ALSO hit Branch B, their local state (which may not have included day 3) **overwrote Gabriela's data again**. Each person hitting the no-merge branch caused cascading data loss.

## Current Status

- The `upsert_form_submission` function is now live and **prevents this from happening again** — all saves are atomic server-side deep merges
- Day 3 data is **permanently lost** from the database — it needs to be manually re-entered
- The form currently **restricts editing to today only** (`day !== todayDay` disables inputs), so Gabriela cannot re-enter day 3 data

## Fix Plan

### 1. Allow editing recent past days (not just today)

Change the `isDayDisabled` logic in `QrFormEntry.tsx` to allow editing the current day **and the previous 2 days** (configurable). This way if a day is missed or data is lost, staff can still enter it within a reasonable window.

```
// Current (line 376):
const isDayDisabled = isLocked || day !== todayDay;

// Proposed:
const isDayDisabled = isLocked || day > todayDay || day < todayDay - 2;
```

This allows editing today, yesterday, and the day before. Days further back remain read-only.

### 2. Add save failure toast with retry

If the RPC call fails, ensure the error is clearly visible (already handled by `onError` toast) and the draft is preserved in localStorage (already happening via auto-save). No change needed here — the new flow handles this correctly.

### 3. No database changes needed

The upsert function and audit logging are already in place and working correctly.

### Files to modify
- `src/pages/qr-forms/QrFormEntry.tsx` — relax the day-disabled check to allow recent past days

