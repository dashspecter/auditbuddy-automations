
# Multi-Role Task Visibility Fix — IMPLEMENTED

## What was done (4 files)

### 1. `src/hooks/useTasks.ts` — Task enrichment
- Added `task_role_ids: string[]` and `task_role_names: string[]` to Task interface
- Batch-fetches `task_roles` junction table + resolves role names from `employee_roles`
- Attaches arrays to every task object (same pattern as `task_location_ids`)

### 2. `src/lib/taskCoverageEngine.ts` — Coverage engine
- `checkTaskCoverage` now collects ALL role names (primary `assigned_role.name` + junction `task_role_names`)
- Matches shift role against ANY assigned role — if any match, coverage passes
- Updated location-only check: tasks with junction roles are NOT treated as location-only

### 3. `src/pages/Tasks.tsx` — Role filter
- `filterTasks` now checks both `assigned_role_id` (primary) and `task_role_ids` (junction)
- Filtering by Kitchen Helper now includes tasks that have Kitchen Helper in their junction roles

### 4. `src/components/kiosk/KioskDashboard.tsx` — Kiosk display
- Multi-role tasks appear ONCE under primary role group
- Additional assigned roles shown as secondary badges next to task title

## Surfaces affected
- **Mobile staff view**: Kitchen Helper with Kitchen Helper shift now passes coverage for Cook-primary tasks that also have Kitchen Helper in junction
- **Kiosk**: Same coverage fix + visual badges for multi-role tasks
- **Dashboard All Tasks**: Role filter dropdown matches junction roles
- **Ops Dashboard**: Inherits coverage fix via unified pipeline
