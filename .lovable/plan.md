

## Freeze SLA % for Closed/Cancelled Corrective Actions

### Problem
The `getSLAPercent` helper always uses the current time (`Date.now()`) to calculate how much of the SLA window has elapsed. This means closed CAs keep showing an increasing SLA %, which is misleading -- the screenshot shows closed items at 12% and 45%, but those numbers will keep climbing over time even though the CA is resolved.

### Solution
Update `getSLAPercent` to accept an optional `closedAt` timestamp. When provided, use that timestamp instead of `now` to freeze the SLA at the moment the CA was closed. Then pass `closed_at` from each CA record when calling the helper.

### What Changes

**File: `src/hooks/useCorrectiveActions.ts`**
- Update `getSLAPercent` signature to accept an optional third parameter: `closedAt?: string | null`
- When `closedAt` is provided, use `new Date(closedAt).getTime()` instead of `Date.now()`

**File: `src/pages/correctiveActions/CorrectiveActionsList.tsx`**
- Pass `ca.closed_at` as the third argument to `getSLAPercent(ca.created_at, ca.due_at, ca.closed_at)`

**File: `src/pages/correctiveActions/CorrectiveActionDetail.tsx`**
- Pass `ca.closed_at` as the third argument to `getSLAPercent(ca.created_at, ca.due_at, ca.closed_at)`

### Technical Detail

```text
Before:  getSLAPercent(createdAt, dueAt)         -> always uses Date.now()
After:   getSLAPercent(createdAt, dueAt, closedAt) -> uses closedAt if provided, else Date.now()
```

This is a minimal, non-breaking change -- the third parameter is optional so any other callers continue working as before.
