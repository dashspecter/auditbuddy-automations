

## Fix Audit Trigger -- Safety-Verified

### The Problem
The `fn_platform_audit_trigger` crashes on `attendance_logs` because it references `NEW.company_id` directly, but `attendance_logs` doesn't have that column. This is the **only** table (out of 20 attached) missing the column.

### The Fix
Replace direct column access (`NEW.company_id`) with safe jsonb extraction (`v_new->>'company_id'`). This produces the exact same value for all 19 tables that have the column, and gracefully returns NULL for `attendance_logs`.

### Safety Verification

| What | Before Fix | After Fix | Change? |
|------|-----------|-----------|---------|
| 19 tables with company_id | Audit logged correctly | Audit logged identically | No |
| attendance_logs (no company_id) | CRASHES -- blocks check-in | Skips audit log (no company_id to log) | Bug fix only |
| Data written to tables | Unchanged (RETURN NEW/OLD) | Unchanged | No |
| custom_data/cached_section_scores stripping | Already stripped | Still stripped | No |
| Auth/user lookup | Same logic | Same logic | No |

### Migration

```sql
CREATE OR REPLACE FUNCTION public.fn_platform_audit_trigger()
-- Only change: use v_new->>'company_id' and v_old->>'company_id'
-- instead of NEW.company_id and OLD.company_id
```

### Risk: None
- No schema changes
- No new tables or columns
- No RLS policy changes
- No application code changes
- Identical output for all existing tables
- Only unblocks the one table that was crashing

