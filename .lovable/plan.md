

## Fix: Eliminate Timeout Error on Audit Submit

### Root Cause

The "canceling statement due to statement timeout" error happens because the submit function bundles **everything sequentially** -- including non-critical cleanup work that triggers slow database operations.

Here's what happens today:

```text
performSubmit() -- all sequential, all-or-nothing:
  1. Save/update the audit row          --> triggers fire (log_audit_activity + fn_platform_audit_trigger)
  2. DELETE other draft rows             --> triggers fire AGAIN for each deleted row
  3. clearDraft (localStorage)
  4. toast success
  5. navigate
```

When step 2 (draft cleanup) times out, the ENTIRE function throws. The retry then re-runs everything -- including the already-successful save -- producing both an Error toast and a Success toast simultaneously (exactly what the screenshot shows).

### The Fix

**Separate the critical path (save the audit) from non-critical work (cleanup drafts).**

The audit save (step 1) is what matters. Draft cleanup, CAPA rules, and activity logging are housekeeping -- they should never block the user or cause an error.

### Changes

**File: `src/pages/LocationAudit.tsx`**

Restructure `performSubmit` into two phases:

```text
Phase 1 -- Critical (awaited, retry on timeout):
  1. Save/update the audit row
  2. (for new audits) Get the new audit ID

Phase 2 -- Non-critical (fire-and-forget, errors silently logged):
  3. Delete other draft rows
  4. clearDraft (localStorage)

Then immediately:
  5. toast success
  6. navigate
  7. fireAuditCAPARules (already fire-and-forget)
```

This means:
- If the save succeeds, the user sees success immediately -- no waiting for draft cleanup
- If draft cleanup times out, it fails silently in the background (drafts get cleaned up next time anyway)
- The retry logic only covers the critical save, not cleanup

**File: `src/pages/staff/StaffLocationAudit.tsx`**

Apply the same pattern -- this file has the identical issue for staff users. The draft cleanup after submit should be non-blocking.

### What This Does NOT Change

- No database changes, no trigger modifications
- Audit data integrity is unchanged -- the save itself is still fully awaited with retry
- CAPA rules still fire the same way (already fire-and-forget)
- Draft cleanup still happens, just doesn't block the success flow

### Why Not Fix the Triggers?

The triggers (`fn_platform_audit_trigger`, `log_audit_activity`) serve important compliance/audit-trail purposes. Removing or modifying them could break regulatory requirements. The right fix is to not let non-critical operations block the user experience.

