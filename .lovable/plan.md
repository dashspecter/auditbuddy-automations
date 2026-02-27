

# Bug: Staff Mobile View Shows Only 3 Tasks Instead of All

## Root Cause

Same multi-location bug, different surface. Two places are broken:

### 1. Coverage Engine (`src/lib/taskCoverageEngine.ts`, line 153/195)
The coverage check uses `task.location_id` (single column) to match against `shift.location_id`. A task assigned to 5 locations via `task_locations` has `location_id` set to only the first one alphabetically (e.g., "LBFC Apaca"). When the employee's shift is at "LBFC Amzei", the check fails → `location_mismatch` → task hidden.

### 2. Staff Task Fetching (`src/hooks/useStaffTodayTasks.ts`, lines 287-298)
The role-based task query fetches tasks by `assigned_role_id` without filtering by location — so it correctly fetches all role tasks. BUT the coverage engine then filters them out because `task.location_id` doesn't match the shift location.

The fix needs to happen in the coverage engine — it must check if the shift's location is in the task's `task_location_ids` array (from the junction table), not just the single `location_id` column.

## Fix Plan

### A. Enrich tasks with `task_location_ids` in `useStaffTodayTasks.ts`
After fetching tasks, batch-query `task_locations` to attach `task_location_ids: string[]` to each task (same pattern already applied to `useTasks.ts`).

### B. Update coverage engine in `taskCoverageEngine.ts`
At line 153, read `task.task_location_ids` array. At line 195, change the location check from:
```typescript
if (locationId && shift.location_id !== locationId) {
```
to:
```typescript
const taskLocationIds = (task as any).task_location_ids;
const allLocationIds = taskLocationIds?.length > 0 
  ? taskLocationIds 
  : (locationId ? [locationId] : []);
if (allLocationIds.length > 0 && !allLocationIds.includes(shift.location_id)) {
```

This way, a task assigned to 5 locations matches shifts at any of those 5 locations.

### Files Changed
- `src/hooks/useStaffTodayTasks.ts` — Add `task_location_ids` enrichment after fetching tasks
- `src/lib/taskCoverageEngine.ts` — Use `task_location_ids` array for location matching in coverage check

