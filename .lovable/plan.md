

## Problem
The broadcast shows "0 recipients" because the idempotency key (`broadcast:{template_id}:{employee_id}:{date}`) already exists from today's earlier (failed) attempt. The insert is silently rejected due to the unique constraint, so no new messages are queued.

## Solution
Modify the broadcast edge function to handle retries by using **upsert with conflict resolution** — if a previous message for the same key exists AND its status is `failed`, allow re-queuing it.

### Changes

**1. `supabase/functions/whatsapp-broadcast/index.ts`**
- Change the batch insert to use `.upsert()` with `onConflict: 'idempotency_key'` so failed messages can be retried
- OR: Before inserting, delete any existing messages with `status = 'failed'` that match the current broadcast's idempotency keys
- The simpler approach: before insert, run a DELETE on `outbound_messages` where `idempotency_key` matches the generated keys AND `status IN ('failed', 'queued')`

### Implementation detail
Before the batch insert loop, add:
```typescript
// Clear failed/queued messages from previous attempts today so retry works
const keys = messages.map(m => m.idempotency_key);
await serviceClient
  .from("outbound_messages")
  .delete()
  .in("idempotency_key", keys)
  .in("status", ["failed", "queued"]);
```

This allows retrying a broadcast that previously failed while still preventing duplicate sends for messages that were already `sent` or `delivered`.

