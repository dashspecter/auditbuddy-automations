

# Fix: Show Employee's Location (Not Task's Primary Location) in Staff Task UI

## Root Cause

The staff task views (`StaffTasks.tsx` line 688, `ActiveTasksCard.tsx` line 405) display `task.location?.name`, which is a join on the task's **primary** `location_id` column. For a multi-location task whose primary location is "LBFC Apaca", it shows "LBFC Apaca" even when the staff member is at "LBFC Amzei".

The correct behavior: when a staff member at Location X views a task, the displayed location should be Location X (their shift location), not the task's arbitrary primary location.

## Fix

### A. Resolve employee's shift location and attach to tasks (`src/hooks/useStaffTodayTasks.ts`)

After the pipeline runs (around the `useMemo` block), determine the employee's actual shift location(s) for today by filtering the fetched shifts for assignments matching `staffContext.employeeId`. Then:

1. Extract `myShiftLocationIds` from those shifts
2. Filter pipeline output to only tasks whose `task_location_ids` intersects with `myShiftLocationIds` (fixing the "sees all locations" bug from the approved plan)
3. Attach a `display_location_name` field to each task, set to the employee's shift location name (queried from the shifts or locations table)

### B. Update staff UI components to use `display_location_name`

- **`src/pages/staff/StaffTasks.tsx` (line 688-692)**: Change `task.location?.name` to `(task as any).display_location_name || task.location?.name`
- **`src/components/staff/ActiveTasksCard.tsx` (line 405-408)**: Same change

This ensures multi-location tasks display the employee's working location, while single-location tasks and fallback cases still work correctly.

### Files Changed
- `src/hooks/useStaffTodayTasks.ts` — Add shift-location scoping + `display_location_name` enrichment
- `src/pages/staff/StaffTasks.tsx` — Use `display_location_name` for location display
- `src/components/staff/ActiveTasksCard.tsx` — Use `display_location_name` for location display

