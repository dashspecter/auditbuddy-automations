

# Bug: Kiosk Shows Tasks Under Wrong Department Role Groups

## Root Cause

Multi-role tasks (e.g., "Completare termograme" assigned to both **Shift Manager** + **Kitchen Manager**) correctly pass the department filter (line 285 — at least one role matches FOH). However, the **grouping logic** (line 502) always uses `roleNames[0]` — the first role alphabetically. Since "Kitchen Manager" < "Shift Manager" alphabetically, these tasks get grouped under "KITCHEN MANAGER" in the Front of House kiosk, which is confusing.

The department filter keeps the task (correct), but displays it under a role header that doesn't belong to the department (wrong).

## Fix

### `src/components/kiosk/KioskDashboard.tsx` — Filter role_names before grouping

In the `tasksByRole` useMemo (around line 473), when `departmentId` and `departmentRoleNames` are active, filter each task's `role_names` to only include roles that belong to the current department **before** selecting the primary role for grouping.

```typescript
// Line ~500-506: Change primary role selection
const filteredRoleNames = (departmentId && departmentRoleNames)
  ? roleNames.filter(r => departmentRoleNames.includes(r))
  : roleNames;

const primaryRole = filteredRoleNames.length > 0 ? filteredRoleNames[0] : roleNames[0];
```

This ensures "Completare termograme" gets grouped under "SHIFT MANAGER" (a FOH role) in the Front of House kiosk, and under "KITCHEN MANAGER" in the Kitchen kiosk.

No other files need changes. The filtering logic is correct — only the grouping display needs this department-aware adjustment.

### Files Changed
- `src/components/kiosk/KioskDashboard.tsx` — Department-aware role grouping (~3 lines changed)

