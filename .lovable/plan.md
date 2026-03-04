

# Deep Dive Audit: Staff Audit Scheduling — Issues Found

## Summary

After examining the database schema, RLS policies, hooks, dialog, calendar, and execution page end-to-end, I found **1 critical bug** that will break the flow at runtime, plus **2 minor issues** worth fixing.

---

## Critical Bug: RLS Blocks Status Update After Audit Completion

**What happens**: When a staff member (checker/staff role) completes a scheduled staff audit via `StaffAuditNew.tsx`, the code at line 271-276 tries to update the `scheduled_audits` row's status to `completed`:

```typescript
await supabase
  .from('scheduled_audits')
  .update({ status: 'completed' })
  .eq('id', scheduledId);
```

**Why it fails**: The UPDATE RLS policy on `scheduled_audits` requires `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')`. A regular staff/checker user who was *assigned* the audit cannot update it. The update silently fails (no error thrown, just 0 rows affected), so the audit gets submitted to `staff_audits` but the schedule stays as `scheduled` forever.

**Fix**: Add an RLS policy allowing the assigned user to update their own scheduled audit's status:

```sql
CREATE POLICY "Assigned users can update their scheduled audit status"
ON public.scheduled_audits
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND assigned_to = auth.uid()
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND assigned_to = auth.uid()
);
```

---

## Minor Issue 1: useUpdateScheduledAudit Passes Joined Relations

In `useScheduledAuditsNew.ts` line 134, the mutation destructures `{ id, ...updates }` from a `Partial<ScheduledAudit>`. The `ScheduledAudit` interface includes joined relation fields (`audit_templates`, `locations`, `employees`, `profiles`). If these are accidentally included in the update payload, Supabase will reject them as unknown columns.

**Fix**: Explicitly pick only valid columns before sending to `.update()`.

---

## Minor Issue 2: Company-Scoped User Filtering Missing in Dialog

The "Assign To" dropdown in `ScheduleAuditDialog.tsx` (line 152-162) fetches ALL profiles across all companies. This is a pre-existing issue but should be addressed — filter users by the current user's company via `company_users` join.

---

## What's Working Correctly

- Database: `employee_id` column exists on `scheduled_audits`, nullable, references `employees(id)` — correct
- RLS: SELECT is company-scoped, INSERT/UPDATE/DELETE require admin/manager — correct for scheduling
- Badge: `staff` and `location` variants exist in `badge.tsx` — correct
- Calendar: Staff audit events show employee name, purple color coding, correct routing to `/staff-audits/new?scheduled=ID`
- Dialog: Template type badges display, employee picker appears conditionally for staff templates, validation enforces employee selection
- StaffAuditNew: Fetches scheduled audit data, pre-fills and locks fields, updates status on completion (once RLS is fixed)
- ID extraction: `substring(0, 36)` correctly extracts UUID from `{uuid}-{instanceIndex}` format

---

## Files to Modify

| File | Change |
|---|---|
| Database migration | Add RLS policy for assigned user UPDATE |
| `src/hooks/useScheduledAuditsNew.ts` | Sanitize update payload to exclude joined relations |
| `src/components/ScheduleAuditDialog.tsx` | Filter users query by company (optional but recommended) |

