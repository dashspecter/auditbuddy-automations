

# Multi-Role Task Visibility: Missing Enrichment in Staff & Kiosk Hooks

## Root Cause

The coverage engine (`taskCoverageEngine.ts`) correctly reads `task_role_names` from tasks. The `useTasks` hook (admin dashboard) correctly populates this field. But the two hooks that feed mobile and kiosk views do NOT — so the coverage engine only sees the primary role and rejects tasks when the employee's shift matches a secondary role.

There are 3 specific bugs in `src/hooks/useStaffTodayTasks.ts`:

### Bug 1: Staff mobile path (line 368-371)
Tasks are enriched with `task_location_ids` but NOT `task_role_ids` / `task_role_names`. A Kitchen Helper's shift won't match a Cook-primary task even though Kitchen Helper is in the junction table.

**Fix**: After the `task_locations` enrichment (line 354-366), add the same `task_roles` batch-fetch pattern used in `useTasks.ts`. Fetch `task_roles` junction rows, resolve role names from `employee_roles`, attach `task_role_ids` and `task_role_names` to each task.

### Bug 2: Kiosk non-RPC path — dead code (lines 893 vs 900-919)
Line 893 returns tasks with `role_ids`/`role_names`. Lines 900-919 (which add `task_location_ids`) are **unreachable** — they come after the return statement. Additionally, field names are `role_ids`/`role_names` instead of `task_role_ids`/`task_role_names`.

**Fix**: Merge into a single return that includes both location and role enrichment using the correct field names (`task_role_ids`, `task_role_names`, `task_location_ids`).

### Bug 3: Kiosk RPC path (lines 727-752)
Maps RPC results to `role_ids`/`role_names` but coverage engine reads `task_role_names`.

**Fix**: Also set `task_role_ids` and `task_role_names` when mapping RPC results.

## Changes — Single File

**`src/hooks/useStaffTodayTasks.ts`**:

1. **Staff path (after line 366)**: Add batch-fetch of `task_roles` + `employee_roles` for all task IDs. Build `taskRolesMap` and `roleNamesMap`. In the enrichment at line 368, also set `task_role_ids` and `task_role_names`.

2. **Kiosk RPC path (line 749-752)**: Add `task_role_ids: t.role_ids` and `task_role_names: t.role_names` to the returned object.

3. **Kiosk non-RPC path (lines 872-919)**: Fix the dead code by removing the premature return. Merge location and role enrichment into a single return, using `task_role_ids`, `task_role_names`, and `task_location_ids`.

## Impact
After this fix, all 3 surfaces (mobile staff, kiosk, admin dashboard) will pass junction role names to the coverage engine. A Kitchen Helper will see "Refill mounting section" (Cook-primary, Kitchen Helper in junction) because the coverage engine already handles multi-role matching — it just wasn't receiving the data.

