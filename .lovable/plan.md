

# Fix: Multi-Role Task Visibility

## Problem
Tasks assigned to multiple roles only show for the primary `assigned_role_id`. Additional roles stored in `task_roles` junction table are ignored during read queries.

## Changes — Single File: `src/hooks/useStaffTodayTasks.ts`

### Fix 1: Staff Mobile View (after line 298)
After fetching `roleTasks` via `assigned_role_id`, add a **Step B2** that queries `task_roles` for the employee's `resolvedRoleId`, fetches matching task IDs not already in `roleTasks`, then bulk-fetches those tasks and merges them in.

```typescript
// B2) Multi-role tasks via task_roles junction table
const { data: junctionMatches } = await supabase
  .from("task_roles")
  .select("task_id")
  .eq("role_id", resolvedRoleId);

const junctionTaskIds = (junctionMatches || [])
  .map(tr => tr.task_id)
  .filter(id => !roleTasks.some(t => t.id === id));

if (junctionTaskIds.length > 0) {
  const { data: junctionTasks } = await supabase
    .from("tasks")
    .select(`*, location:locations(id, name), assigned_role:employee_roles(id, name)`)
    .eq("company_id", companyId)
    .is("assigned_to", null)
    .in("id", junctionTaskIds);

  roleTasks = [...roleTasks, ...(junctionTasks || [])];
}
```

Existing deduplication at line ~322 handles overlaps automatically.

### Fix 2: Kiosk View (after line 781)
After fetching `globalRoleTaskIds` via `assigned_role_id`, query `task_roles` for any of the location's `roleIds`, fetch matching task IDs not already included, verify they belong to the same company, and merge into `globalRoleTaskIds`.

```typescript
// Also check task_roles junction for multi-role tasks
const { data: kioskJunctionMatches } = await supabase
  .from("task_roles")
  .select("task_id")
  .in("role_id", roleIds);

const kioskJunctionTaskIds = (kioskJunctionMatches || [])
  .map(tr => tr.task_id)
  .filter(id => !globalRoleTaskIds.includes(id));

if (kioskJunctionTaskIds.length > 0) {
  const { data: junctionGlobalTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("company_id", companyId)
    .is("assigned_to", null)
    .in("id", kioskJunctionTaskIds);

  globalRoleTaskIds = [...globalRoleTaskIds, ...(junctionGlobalTasks || []).map(t => t.id)];
}
```

Existing `Set`-based deduplication at line ~784 handles overlaps.

## What stays the same
- Task creation/edit (already writes to `task_roles` correctly)
- `complete_task_guarded` RPC — untouched
- Time-locks, KPIs, leaderboards, completions — untouched
- No database migration needed — `task_roles` table already exists

## Risk
Zero — purely additive read queries. Deduplication already in place at both merge points.

