

# Bug: Shift Manager Tasks Show "No Coverage" Despite Shift Existing

## Root Cause

The `AllTasksOpsDashboard` runs tasks through `runPipelineForDateRange` a **second time** with its own shifts. The tasks it receives from `useUnifiedTasks` are already virtual instances (with dates set to specific days). The pipeline iterates day-by-day across the week range (Mon-Sun), and for each day calls `checkTaskCoverage(occ, shifts, currentDate)`.

The critical issue: there is only **1 Shift Manager shift today (Feb 27) at LBFC Amzei**. No Shift Manager shifts exist at LBFC Obor or any other location. The coverage engine correctly finds that the Amzei shift matches (since `task_location_ids` includes Amzei). **However**, the `AllTasksOpsDashboard` also generates occurrences for other days in the week (Feb 28, Mar 1, etc.) via recurring task expansion — and those days have **no shifts at all**, producing "No Coverage" entries.

Additionally, the **real smoking gun** is that the `AllTasksOpsDashboard` location filter (line 329) still uses `t.location_id` instead of `task_location_ids`:
```typescript
if (locationFilter !== "all") {
  result = result.filter(t => t.location_id === locationFilter);
}
```

But more importantly, the "No Coverage" section likely contains **duplicate occurrences from the double-pipeline** — tasks processed twice through coverage checking with potentially different shift sets.

## Fix Plan

### A. Remove double-pipeline in `AllTasksOpsDashboard`
Instead of running `runPipelineForDateRange` again on already-processed tasks, use the coverage data that `useUnifiedTasks` already computed. The `AllTasksOpsDashboard` should receive pre-computed `noCoverage` tasks from the parent rather than recomputing coverage independently.

### B. Fix location filter in `AllTasksOpsDashboard` (line 329)
Change `t.location_id === locationFilter` to check `t.task_location_ids` array, matching the pattern already used in `Tasks.tsx filterTasks`.

### Files Changed
- `src/pages/Tasks.tsx` — Pass `noCoverage` tasks from unified pipeline to `AllTasksOpsDashboard`
- `src/components/tasks/AllTasksOpsDashboard.tsx` — Remove redundant `runPipelineForDateRange` call; use pre-computed coverage; fix location filter to use `task_location_ids`

