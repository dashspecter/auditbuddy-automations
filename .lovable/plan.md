

## Fix: Audit Submit Timeout Error

### What's Happening

When Vlad taps "Submit Audit" on mobile, the database insert into `location_audits` triggers 3 cascading operations that all run inside the same transaction:

1. `handle_updated_at` -- sets timestamp (fast)
2. `log_audit_activity` -- inserts into `activity_logs` (moderate)
3. `fn_platform_audit_trigger` -- looks up user email from auth, serializes the entire row (including all form data) as JSON, inserts into `platform_audit_log` (heaviest)

The `authenticated` database role has an **8-second statement timeout**. When the database is under any load (cron jobs, other users), this trigger chain occasionally exceeds 8 seconds, producing the "canceling statement due to statement timeout" error.

### Root Cause

The `fn_platform_audit_trigger` stores the **full row data** (including the `custom_data` JSON with all audit responses) in the `platform_audit_log` table. While individual rows are only ~1.5KB, the combined work of serializing + auth lookup + 2 inserts into separate tables pushes close to the 8-second limit under load.

### The Fix (3 Parts)

#### Part 1: Add Retry Logic to Audit Submission

Update `src/pages/staff/StaffLocationAudit.tsx` to automatically retry the insert/update once on timeout errors. This handles the intermittent nature of the issue without any database changes.

```
Attempt 1 fails (timeout) -> wait 1 second -> Attempt 2 succeeds
```

The retry only triggers for timeout-related errors, not for validation or permission errors.

#### Part 2: Improve Error Messages

Update the `catch` block in `StaffLocationAudit.tsx` to detect timeout errors and show a helpful message:
- "The server took too long to respond. Please try again."
- Instead of the generic "Failed to submit audit"

Also apply the same fix to `LocationAudit.tsx` (the manager/desktop version) for consistency.

#### Part 3: Optimize the Platform Audit Trigger

Create a database migration to update `fn_platform_audit_trigger` to **exclude large JSONB columns** (`custom_data`, `cached_section_scores`) from the audit log data. This reduces the serialization overhead significantly.

Instead of storing the full row:
```sql
v_new := to_jsonb(NEW);  -- includes all JSONB blobs
```

Strip heavy columns:
```sql
v_new := to_jsonb(NEW) - 'custom_data' - 'cached_section_scores';
```

This keeps the audit trail useful (who changed what, when) without storing redundant bulk data that's already in the source table.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/staff/StaffLocationAudit.tsx` | Add retry logic + better timeout error message |
| `src/pages/LocationAudit.tsx` | Add timeout error detection + better message |
| Database migration | Optimize `fn_platform_audit_trigger` to exclude heavy JSONB columns |

### What This Does NOT Change

- No changes to scoring, templates, or audit flow logic
- No changes to RLS policies
- The `activity_logs` and `platform_audit_log` tables continue to work -- just with leaner data
- No changes to mobile UI layout or navigation

### Verification After Implementation

| Check | How |
|-------|-----|
| Submit audit on mobile | Should succeed without timeout |
| Submit audit with all fields filled | Verify no data loss |
| Check `platform_audit_log` | Confirm new entries exist (without `custom_data` blob) |
| Check `activity_logs` | Confirm audit_created entries still logged |
| Retry on timeout | Simulate slow connection, verify retry works silently |
| Error message on persistent failure | Should show "server took too long" not raw DB error |

