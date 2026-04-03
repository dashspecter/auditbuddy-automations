

# Fix: Kiosk Task List Showing Empty Despite Tasks Existing

## Root Cause

The KPI header correctly shows 11 pending tasks (9 overdue), but the task list below says "No tasks scheduled for today". This is because `tasksByRole` (line 592-597) **deletes role groups where no on-shift employees match the role**.

With only 1 employee scheduled today (Iulian Constantin), all tasks assigned to other roles (e.g., Shift Manager, Barista, etc.) get their groups removed from the display — even though they're counted in the KPIs.

This is a pre-existing logic flaw, not caused by recent changes.

## Fix

**File: `src/components/kiosk/KioskDashboard.tsx`** — lines 592-597

Remove the block that deletes role groups with no matching employees:

```typescript
// REMOVE THIS BLOCK (lines 592-597):
Object.keys(roleGroups).forEach(roleName => {
  if (roleName !== "General" && roleGroups[roleName].employees.length === 0) {
    delete roleGroups[roleName];
  }
});
```

Tasks assigned to roles with no one on shift should still be **visible** in the list — they just won't show employee names next to the role header. This matches what the KPI counts already report and ensures the task list is consistent with the header numbers.

## Impact
- Only the `tasksByRole` grouping logic changes — a 5-line deletion
- KPIs, champions, attendance, MTD scores — all untouched
- No hook, routing, or auth changes

