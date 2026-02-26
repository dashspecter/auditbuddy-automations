

# Rejected Evidence: Score Penalty + Employee Notification — IMPLEMENTED

## Summary

When a manager rejects evidence:
1. ✅ The `task_completions` row is **deleted** → task becomes "not done" → score drops
2. ✅ The parent `tasks` row is reset to `status = 'pending'`
3. ✅ An in-app notification is sent to the employee with the rejection reason
4. ✅ No resubmission flow — purely informational

## Flow
```text
Manager rejects proof
  → evidence_packets.status = 'rejected'
  → task_completions row DELETED (matched by task_id + occurrence_date)
  → tasks row reset to 'pending'
  → notification inserted for employee (type: 'warning', targeted by employee ID)
  → employee score recalculated automatically (completion gone)
  → employee sees task as incomplete + notification explaining why
```
