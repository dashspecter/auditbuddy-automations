

# Fix: Task Edit — Persist All Selected Locations

## Changes (3 edits, 2 files)

### 1. `src/hooks/useTasks.ts` — `useUpdateTask` mutation
- Destructure `location_ids` from the input (alongside existing `assigned_role_ids`)
- After task update succeeds, add a sync block for `task_locations` (delete existing → re-insert all), identical to the `task_roles` pattern already on lines 690–713

### 2. `src/pages/TaskEdit.tsx` — Submit handler
- Add `location_ids: formData.location_ids` to the `updateTask.mutateAsync()` call (line ~154–178)

### 3. `src/pages/TaskEdit.tsx` — Initial load
- When populating `formData` on edit (line ~125), query `task_locations` for the task ID and use those IDs instead of falling back to `[task.location_id]`

## Impact
- Additive only; no existing behavior changes
- `location_id` column still set to first location for backward compatibility
- All read paths already consume `task_locations` — no changes needed

