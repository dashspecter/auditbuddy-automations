## Shift Scheduling Plan — COMPLETED

All issues from the verification report have been resolved.

### Fixes Applied

1. **`sync_shift_publish_status` trigger updated** — Now handles `'open'` status on both INSERT and UPDATE:
   - `status='open'` → `is_published=true`, `is_open_shift=true`
   - `is_published` change with `is_open_shift=true` → `status='open'`
   - `status='published'` → `is_open_shift=false` (clears open flag)
   - `status='draft'` → `is_published=false`, `is_open_shift=false`

2. **Approvals badge count fixed** — Now includes pending shift assignments from loaded shifts data, not just governance items. Badge shows total of governance items + pending shift claims.

3. **Open shift amber badges verified** — Open shifts render with `border-amber-500 text-amber-500` badges, distinct from Draft badges (`border-orange-500 text-orange-500`). No changes needed.
