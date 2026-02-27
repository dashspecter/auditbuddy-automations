

# Fix: Off-Duty Staff Should See No Tasks

## Change
**File: `src/hooks/useStaffTodayTasks.ts`** — Lines 462-469 only.

Add an `else if` branch after the existing location filter:

```typescript
let locationFilteredTasks = pipelineResult.tasks;
if (myShiftLocationIdsForQuery.length > 0) {
  locationFilteredTasks = pipelineResult.tasks.filter((t) => {
    const taskLocIds = (t as any).task_location_ids as string[] | undefined;
    if (!taskLocIds || taskLocIds.length === 0) return true;
    return taskLocIds.some((locId) => myShiftLocationIdsForQuery.includes(locId));
  });
} else if (shifts.length > 0) {
  // Shifts exist but employee has no approved assignment → off duty, no tasks
  locationFilteredTasks = [];
}
// If shifts.length === 0 → company doesn't use scheduling, show all (backward compat)
```

No other files or lines change.

