

# Bug: Kiosk Shows Fewer Tasks Than Expected for Shift Manager

## Root Cause

The kiosk task pipeline (`useKioskTodayTasks`) never enriches tasks with `task_location_ids` from the junction table. When the coverage engine runs, it falls back to `task.location_id` (the single primary column). For multi-location tasks, this primary `location_id` may point to a different location (e.g., "LBFC Apaca") than the kiosk's location ("LBFC Amzei"). The coverage check then fails with `location_mismatch`, hiding the task.

The staff mobile path was just fixed with `task_location_ids` enrichment, but the kiosk path was missed.

## Fix

### A. Enrich kiosk tasks with `task_location_ids` in `useStaffTodayTasks.ts`

In the `useKioskTodayTasks` hook, after fetching `rawTasks` (around line 766), add a batch query to `task_locations` to attach `task_location_ids: string[]` to each task — same pattern used in the staff path (lines 326-346).

For the RPC path (anonymous kiosk with `kioskToken`): after mapping RPC results at line 638, batch-query `task_locations` for all returned task IDs and attach `task_location_ids`.

For the non-RPC path: same enrichment after line 764.

### B. No changes needed to the coverage engine

The coverage engine already reads `task_location_ids` (fixed in the previous change). It just needs the data to be present on the task objects, which this fix provides.

### Files Changed
- `src/hooks/useStaffTodayTasks.ts` — Add `task_location_ids` enrichment to kiosk raw task query (~15 lines added)

