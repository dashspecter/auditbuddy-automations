

## Per-Task WhatsApp Notification Toggle

### What Changes

Add a simple boolean column `notify_whatsapp` to the `tasks` table (default `false`) and a toggle switch in the task creation form. Only tasks with this flag enabled will trigger WhatsApp notifications.

### Why It's Safe

- **Additive only**: One new column with a default value -- no existing data or behavior breaks.
- **Default is OFF**: Existing tasks won't suddenly start sending messages.
- **No schema conflicts**: The column doesn't affect any existing queries, RLS policies, or triggers.

### Steps

#### 1. Database Migration

Add a single column:
```sql
ALTER TABLE public.tasks
ADD COLUMN notify_whatsapp BOOLEAN NOT NULL DEFAULT false;
```

#### 2. Task Creation Form (`src/pages/TaskNew.tsx`)

Add a "Notify via WhatsApp" toggle (using the existing `Switch` component) near the assignment section. Only visible when the `whatsapp_messaging` module is active. The toggle sets `notify_whatsapp` in the form data passed to `useCreateTask`.

#### 3. Guard Notifications in `useCreateTask` (`src/hooks/useTasks.ts`)

Wrap the existing WhatsApp notification block with:
```
if (task.notify_whatsapp) { ... send notifications ... }
```

One line change -- if the flag is false, no notifications fire.

#### 4. Guard the Cron Function (`supabase/functions/check-task-notifications/index.ts`)

Add `.eq("notify_whatsapp", true)` to both the upcoming and overdue task queries. Tasks without the flag are silently skipped.

### Summary

| Area | Change | Risk |
|------|--------|------|
| Database | 1 new boolean column (default false) | None |
| Task form | 1 toggle switch | None (additive UI) |
| useCreateTask hook | 1 if-guard | None (skips silently) |
| Cron edge function | 2 query filters | None (fewer results) |

No existing functionality is modified -- only new, optional behavior is added.
