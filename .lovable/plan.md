

# Why "Chef" Appears in the Kiosk — and How to Fix It

## Root Cause

The kiosk groups tasks by the role names stored on each task (`role_names` from `task_roles` junction or `assigned_role`). If any task has "Chef" as its primary assigned role, the kiosk creates a "CHEF" group header — **even if no employee with that role is scheduled today**.

Look at line 514-520 of `KioskDashboard.tsx`:
```typescript
const primaryRole = displayRoles[0]; // e.g. "Chef"
if (!roleGroups[primaryRole]) {
  roleGroups[primaryRole] = { tasks: [], employees: [] };
}
```

Then at line 525-528, it tries to find matching employees:
```typescript
roleGroups[roleName].employees = todaysTeam.filter(e => e.role === roleName);
// Returns [] for "Chef" since no one has that role
```

The group is created but has zero employees. It still renders with the "CHEF" header and shows tasks that nobody can complete.

Additionally, line 509-512 has a fallback that makes it worse: when the department filter removes "Chef" from `filteredRoleNames` (since it's not a department role), the code **falls back to the original unfiltered role names** — reintroducing "Chef":
```typescript
const displayRoles = filteredRoleNames.length > 0 ? filteredRoleNames : roleNames;
```

## Two Issues to Fix

1. **Don't show role groups with zero scheduled employees** — if no one is on shift with that role, skip the group entirely (the tasks are unreachable anyway).

2. **Fix the department filter fallback** — when `filteredRoleNames` is empty (no department match), the task should be excluded from the kiosk entirely, not fall back to showing all roles.

## Fix — `src/components/kiosk/KioskDashboard.tsx`

In the `tasksByRole` useMemo (lines 479-560):

1. **Line 512**: Change the fallback — if `filteredRoleNames` is empty and department filter is active, skip the task (it belongs to a role outside this department):
```typescript
if (departmentId && departmentRoleNames && filteredRoleNames.length === 0) {
  return; // Task's roles don't belong to this department — skip
}
const displayRoles = filteredRoleNames.length > 0 ? filteredRoleNames : roleNames;
```

2. **After line 528**: Filter out role groups that have zero scheduled employees (no one can work on these tasks):
```typescript
// Remove role groups with no scheduled employees (stale/mismatched roles)
Object.keys(roleGroups).forEach(roleName => {
  if (roleName !== "General" && roleGroups[roleName].employees.length === 0) {
    delete roleGroups[roleName];
  }
});
```

This ensures "Chef" (or any other orphaned role) won't appear when no employee with that role is scheduled.

