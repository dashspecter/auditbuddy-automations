

## Add WhatsApp Notifications for Task Events

### Overview

Wire up WhatsApp notifications for three task-related scenarios:

1. **Task Assigned** -- When a manager creates a task and assigns it to a specific employee (`assigned_to`) or to a role (`assigned_role_id`), all affected employees get a WhatsApp message.

2. **Task Upcoming (Soon Active)** -- A scheduled cron job checks for tasks whose unlock window opens in the next 30 minutes and sends a reminder so staff know a task is about to become available.

3. **Task Overdue** -- A scheduled cron job detects tasks past their deadline that haven't been completed and notifies the assigned employee(s).

### How Shared Tasks Work

- **Directly assigned** (`assigned_to` is set): Only that one employee is notified.
- **Role-based / shared** (`assigned_role_id` is set, `assigned_to` is null): All employees with that role are looked up and each receives a notification.
- **Individual tasks** (`is_individual = true`): Each employee with the matching role gets their own notification (since each must complete it independently).

### Changes

#### 1. Seed WhatsApp Message Templates (Data Insert)

Add three new approved templates to `wa_message_templates` for company `421f70ca-0ce0-49f9-8d12-aa1c0ea39c98`:

| Template Name | Body | Variables |
|---|---|---|
| `task_assigned` | "You have a new task: **{{task_title}}**. Due: {{due_info}}. Location: {{location}}." | task_title, due_info, location |
| `task_upcoming` | "Reminder: Task **{{task_title}}** will be available in {{minutes}} minutes at {{unlock_time}}." | task_title, minutes, unlock_time |
| `task_overdue` | "Task **{{task_title}}** is overdue (was due {{due_info}}). Please complete it as soon as possible." | task_title, due_info |

#### 2. Update `useCreateTask` hook (`src/hooks/useTasks.ts`)

The existing `onSuccess` callback already has a basic WhatsApp call for `assigned_to`. Expand it to:

- Keep the existing direct-assignment notification.
- Add role-based notification: when `assigned_role_id` is set and `assigned_to` is null, query employees with that role and send a `task_assigned` notification to each via `notifyBatch`.
- This requires importing `useWhatsAppNotifier` and restructuring the mutation hook slightly.

Since `useCreateTask` is a mutation hook (not a component), we'll move the notification logic into the `onSuccess` callback by looking up employees by role via a Supabase query inside the callback.

#### 3. Create `check-task-notifications` Edge Function

A new edge function (`supabase/functions/check-task-notifications/index.ts`) that handles both **upcoming** and **overdue** scenarios:

- **Upcoming**: Query tasks where `start_at` is within the next 30 minutes and no notification has been sent yet (checked via `outbound_messages` idempotency key).
- **Overdue**: Query tasks past their deadline (`start_at + duration_minutes` or `due_at`) that are not completed, and send an overdue notification.
- For each task, resolve the target employees (direct assignment or role-based lookup).
- Call `send-whatsapp` internally for each notification (reusing existing infrastructure).

#### 4. Set Up Cron Job (SQL Insert)

Schedule `check-task-notifications` to run every 15 minutes via `pg_cron` + `pg_net`:

```text
*/15 * * * *  -->  POST https://wwprkfaknkxrebtplfut.supabase.co/functions/v1/check-task-notifications
```

#### 5. Add `verify_jwt = false` for the new edge function

Update `supabase/config.toml` to disable JWT verification for `check-task-notifications` (it will be called by cron with the anon key).

### Technical Details

- The `send-whatsapp` function already handles opt-in checks, quiet hours, throttling, and idempotency -- so the new edge function only needs to identify recipients and call it.
- Idempotency keys like `task_upcoming:{task_id}:{occurrence_date}` and `task_overdue:{task_id}:{occurrence_date}` prevent duplicate notifications.
- The cron function uses the service role key internally, consistent with existing patterns.
- No database schema changes needed -- all tables (`wa_message_templates`, `outbound_messages`, `employees`, `tasks`, `task_completions`) already exist.

