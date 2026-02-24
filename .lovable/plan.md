

## Fix "Additional Daily Times" Not Loading on Task Edit

### Problem
When editing a task that was previously saved with "Additional Daily Times" (recurrence_times), the saved times don't appear in the edit form. Investigation shows:

- The `recurrence_times` column exists in the database and the Task type includes it
- The `useTasks()` query uses `select(*)` which returns all columns including `recurrence_times`
- The edit form initialization at line 127 uses `(task as any).recurrence_times` -- the `as any` cast is unnecessary but shouldn't cause issues
- The evidence_policies upsert (lines 179-188) is inside the same try/catch as the task update -- if evidence_policies RLS fails (which DB logs confirm is happening), it throws an error, shows "Failed to update task" toast, and the user may retry or think it didn't save, even though the task update at line 145 already succeeded

### Root Causes Found

1. **Error masking**: The evidence_policies save shares a try/catch with the task update. When evidence_policies RLS fails, the user sees "Failed to update task" even though the task (including recurrence_times) was actually saved successfully. This creates confusion about whether the save worked.

2. **Unnecessary `as any` cast**: Line 127 uses `(task as any).recurrence_times` even though the `Task` interface already includes `recurrence_times: string[] | null`. This is a code smell but not the functional bug.

### Changes

**File: `src/pages/TaskEdit.tsx`**

1. **Separate error handling for evidence policy** (lines 170-193): Wrap the evidence_policies operations in their own try/catch so a failure there doesn't mask a successful task update. Show a specific warning toast like "Task saved but evidence policy failed" instead of the misleading "Failed to update task".

2. **Remove `(task as any)` cast** (line 127): Change `(task as any).recurrence_times` to `task.recurrence_times` since the `Task` type already has this field.

3. **Move toast.success before evidence policy** (line 195): Move the success toast and navigation to right after the task update succeeds, before attempting the evidence policy save. If evidence policy fails, show a separate warning.

### Technical Detail

```text
BEFORE (simplified):
try {
  await updateTask(...)           // Task update (works)
  await evidencePolicy(...)       // Evidence policy (may fail - RLS error)
  toast.success("Task updated")   // Never reached if evidence fails
  navigate("/tasks")
} catch {
  toast.error("Failed to update task")  // Misleading - task DID save
}

AFTER (simplified):
try {
  await updateTask(...)           // Task update
  toast.success("Task updated")   // Shows immediately on task success
  // Evidence policy in separate try/catch
  try {
    await evidencePolicy(...)
  } catch {
    toast.warning("Evidence policy could not be saved")
  }
  navigate("/tasks")
} catch {
  toast.error("Failed to update task")  // Only for real task failures
}
```

### What This Fixes
- Task updates (including recurrence_times) will save and show success correctly
- Evidence policy failures won't mask successful task saves
- Previously saved recurrence_times will load properly on edit (they always did load -- the confusion was caused by the error masking making users think saves failed)
- No database changes, no schema changes, no impact on other features
