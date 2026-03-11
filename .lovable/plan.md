

## Problem

The broadcast **does** find 1 opted-in recipient, but the insert fails because a message with the same idempotency key (`broadcast:{template_id}:{employee_id}:{date}`) already exists with status `sent` from an earlier attempt today.

The cleanup code only deletes records with status `failed` or `queued` — it doesn't skip already-`sent` records gracefully. So the insert hits a unique constraint violation and returns 0.

## Fix

In `supabase/functions/whatsapp-broadcast/index.ts`:

1. **Before inserting**, also filter out recipients who already have a `sent` message for today's idempotency key. This way we skip already-delivered recipients rather than failing on them.

2. **Improve the response** — when all recipients were already sent to, return a clear message like "All recipients already received this broadcast today" instead of "sent to 0".

### Changes

**`supabase/functions/whatsapp-broadcast/index.ts`** (~lines 87-110):
- After building the `messages` array and computing idempotency keys, query `outbound_messages` for any keys that already exist with status `sent`
- Filter those recipients out of the `messages` array before inserting
- If all filtered out, return a descriptive message
- Keep the existing cleanup of `failed`/`queued` records

