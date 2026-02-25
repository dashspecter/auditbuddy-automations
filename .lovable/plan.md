

## Problem

Evidence submission fails for recurring/virtual task occurrences because the `subjectId` passed to the `EvidenceCaptureModal` is the raw task ID — which for recurring tasks is a virtual occurrence ID like `uuid-virtual-2026-02-25`. The `evidence_packets.subject_id` column is type `uuid`, so inserting a non-UUID string causes a database error, resulting in the "Failed to submit proof" toast.

Both `StaffTasks.tsx` (line 108) and `ActiveTasksCard.tsx` (line 101) pass:
```
subjectId={evidenceGateTask.task.id}  // e.g. "abc123-virtual-2026-02-25" — NOT a valid UUID
```

The `baseTaskId` is already computed via `getOriginalTaskId()` on the line above, but it's only used for the policy lookup — not passed as the `subjectId`.

## Fix

**Files: `src/pages/staff/StaffTasks.tsx` and `src/components/staff/ActiveTasksCard.tsx`**

Change the `subjectId` prop from `evidenceGateTask.task.id` to `baseTaskId` (the resolved UUID) in both files. This is a one-line change in each file.

```
subjectId={baseTaskId}
```

This is safe because:
- `baseTaskId` is already computed on the line above via `getOriginalTaskId()`
- The evidence policy is already looked up using `baseTaskId`
- The `evidence_packets` table correctly stores the base task UUID as the subject
- No other logic depends on the virtual occurrence ID being stored in `subject_id`

No database changes, no new code, no breaking changes — just routing the correct UUID to the insert.

