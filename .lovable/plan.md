

# Confirmation: Will Mobile Staff Users See Multi-Role Tasks?

## Current State

**Mobile staff view (`useStaffTodayTasks.ts`)**: The "Step B2" junction query was already added in the earlier fix — it fetches tasks from `task_roles` matching the employee's role. So the task IS fetched.

**However, there's a critical downstream blocker**: After fetching, ALL views (mobile, kiosk, dashboard) run tasks through `runPipelineForDate()` → `checkTaskCoverage()` in the coverage engine. At line 251 of `taskCoverageEngine.ts`:

```typescript
const roleMatches = rolesMatch(shift.role, roleName);
// roleName = task.assigned_role?.name — PRIMARY role only (e.g., "Cook")
```

If the employee is a **Kitchen Helper** with a Kitchen Helper shift, and the task's primary role is **Cook**, the coverage check FAILS. The task gets marked "no coverage" and filtered out in execution mode — **even though the task was correctly fetched via the junction table**.

This means: **the Step B2 fix alone is NOT enough for mobile**. The coverage engine will still reject the task.

## The Proposed Fix Covers All Surfaces

The 4-file fix addresses this completely:

| File | What it fixes | Surfaces affected |
|---|---|---|
| `useTasks.ts` — enrich with `task_role_ids` / `task_role_names` | Makes junction role data available to all downstream code | All |
| `taskCoverageEngine.ts` — check ALL role names, not just primary | Coverage passes if ANY assigned role matches the shift | **Mobile, Kiosk, Dashboard, Ops** |
| `Tasks.tsx` — filter by junction roles too | Role dropdown filter includes multi-role tasks | Admin All Tasks |
| `KioskDashboard.tsx` — show once with badges | Display cleanup | Kiosk |

**Yes — after this fix, a Kitchen Helper will see "Refill mounting section" on their mobile view**, because:
1. Step B2 fetches it ✓ (already done)
2. Coverage engine will match "Kitchen Helper" shift against the task's junction role "Kitchen Helper" ✓ (this fix)

Same for Cook, Kitchen Manager, or any other role in the `task_roles` junction.

## Implementation Plan (4 files)

1. **`src/hooks/useTasks.ts`**: Add `task_role_ids: string[]` and `task_role_names: string[]` to Task interface. Batch-fetch `task_roles` + `employee_roles` for all tasks, attach arrays to each task object.

2. **`src/lib/taskCoverageEngine.ts`**: In `checkTaskCoverage`, collect all role names (primary + junction via `task_role_names`). Match shift against ANY of them.

3. **`src/pages/Tasks.tsx`**: Update `filterTasks` role check: `if (matchesPrimary || matchesJunction)`.

4. **`src/components/kiosk/KioskDashboard.tsx`**: Group multi-role tasks once, show all role names as badges.

