

# Rejected Evidence: Score Penalty + Employee Notification

## Understanding

When a manager rejects evidence:
1. The task becomes "not done" — the employee's score drops
2. The employee receives an in-app notification with the rejection reason
3. There is **no resubmission flow** — it's purely informational

## Changes

### 1. Delete task completion on rejection
**`src/hooks/useEvidencePackets.ts`** — `useReviewEvidencePacket` mutation

After updating the evidence packet to `"rejected"`:
- Query the packet's `subject_type` and `subject_id`
- If `subject_type === "task_occurrence"`, delete the matching `task_completions` row (by `task_id` + `occurrence_date` derived from the subject)
- Also update the parent `tasks` row: set `status = 'pending'`, clear `completed_at`, `completed_by`, `completed_late`
- This immediately drops the employee's score since the completion no longer exists

On `"approved"`: no special action needed (task stays completed).

### 2. Send in-app notification to employee on rejection
**`src/hooks/useEvidencePackets.ts`** — same mutation, after rejection

- Look up the employee who created the packet (`created_by` on the evidence packet → find their `employee` record)
- Insert a row into the `notifications` table with:
  - `type: 'warning'`
  - `title: 'Evidence Rejected'`
  - `message`: includes the task name + manager's rejection reason (if provided)
  - `target_employee_ids: [employee.id]` (targeted only to that employee)
- The existing `useNotifications` hook + realtime subscription will surface this automatically on the employee's mobile view

### 3. Show rejection badge on employee task list (informational)
**`src/pages/staff/StaffTasks.tsx`**

- Since the task completion is deleted, the task will reappear as "pending" in the employee's task list
- No additional badge needed — the task simply shows as incomplete again
- The notification tells them why

### 4. Remove resubmit functionality from EvidenceStatusBadge for tasks
**`src/components/evidence/EvidenceStatusBadge.tsx`** (if needed)

- For `task_occurrence` subject type, the "Resubmit" link should not appear since resubmission is not part of this flow

## Flow Summary
```text
Manager rejects proof
  → evidence_packets.status = 'rejected'
  → task_completions row DELETED
  → tasks row reset to 'pending'
  → notification inserted for employee
  → employee score recalculated (completion gone)
  → employee sees task as incomplete + notification explaining why
```

