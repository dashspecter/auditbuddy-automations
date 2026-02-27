

# Bug: Multi-Location Tasks Only Appear Under One Location

## Root Cause

The system has **two layers of location data** for tasks:
1. **`tasks.location_id`** — stores only the **first** location from the array (`formData.location_ids[0]`)
2. **`task_locations`** junction table — stores **all** assigned locations correctly

The bug exists in **three places**:

### 1. Task list filtering (Tasks.tsx, line 373)
```typescript
if (selectedLocationId !== "all" && t.location_id !== selectedLocationId) return false;
```
This checks `t.location_id` (single column), so if a task is assigned to 5 locations but `location_id` stores only "LBFC Apaca" (the first alphabetically), filtering by "LBFC Amzei" hides it.

### 2. Task list display (Tasks.tsx, line 94-98)
```typescript
{task.location && <span>{task.location.name}</span>}
```
Only shows one location name from the joined `location_id` FK. A task assigned to 5 locations shows "LBFC Apaca" only.

### 3. useTasks hook query (useTasks.ts, line 99-100)
```typescript
if (filters?.locationId) {
  query = query.eq("location_id", filters.locationId);
}
```
Server-side filter also uses the single column.

## Fix Plan

### A. `src/hooks/useTasks.ts` — Enrich tasks with all locations from junction table
After fetching tasks, batch-query `task_locations` + `locations` to attach a `task_location_ids: string[]` array to each task. When `locationId` filter is active, filter using the junction table instead of the `location_id` column.

### B. `src/pages/Tasks.tsx` — Fix `filterTasks` to use junction data
Change line 373 from checking `t.location_id` to checking if `selectedLocationId` exists in the task's `task_location_ids` array.

### C. `src/pages/Tasks.tsx` — Display all assigned locations
Update TaskListItem (line 94-98) to show all location names (e.g., "LBFC Amzei +4") or show badges for each location, instead of just the single `location.name`.

### Files Changed
- `src/hooks/useTasks.ts` — Add junction-table location enrichment to `useTasks` query
- `src/pages/Tasks.tsx` — Fix `filterTasks` and `TaskListItem` display

