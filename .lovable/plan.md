

# Add "Record Absence" to Shift Scheduling Page (Web + Mobile)

## Goal
Allow managers to right-click or tap an assigned employee's name on a shift card in the Shift Scheduling page to record an absence — reusing the existing `RecordAbsenceDialog` component.

## Entry Points (3 views to modify)

### 1. `EnhancedShiftWeekView.tsx` (Desktop Week View)
- In the **employee view** grid cells (lines ~1090-1150), where shift cards show employee names, add a context menu or a small "Mark Absent" action. Since right-click would conflict with browser context menus, the approach is:
  - Add a small `AlertTriangle` icon button next to employee names on shift cards for **past/today shifts only**
  - Clicking it opens the `RecordAbsenceDialog`
  - Query `workforce_exceptions` for the current week to show "Absent" badge on cards that already have a recorded absence
- In the **location view** grid cells (lines ~930-985), same approach for the employee names rendered inside shift cards

### 2. `MobileShiftDayView.tsx` (Mobile View)
- On each shift card with an assigned employee (lines ~230-304), add a long-press or tap action for past/today shifts
  - Add a small "Absent" button or make the employee name tappable to open `RecordAbsenceDialog`
  - Show "Absent" badge on cards with recorded absences

### 3. `Shifts.tsx` Day View (Desktop Day View)
- In the assigned staff badges section (lines ~298-312), make employee badges tappable for past/today shifts to open `RecordAbsenceDialog`
- Show "Absent" badge styling on employees with recorded absences

## Shared Logic
- All three views need to:
  1. Query `workforce_exceptions` (type='absence') for the displayed date range
  2. Track recorded absences as a `Set<string>` keyed by `employeeId_shiftId`
  3. Gate the action to past/today shifts only (same `isDayTappable` logic from ManagerSchedule)
  4. Import and render `RecordAbsenceDialog` with `selectedAbsence` state
  5. On successful recording, invalidate shifts queries to refresh badges

## What We Don't Touch
- `RecordAbsenceDialog` component — reuse as-is, no changes needed
- Auth flow, navigation, routes, payroll logic — zero changes
- Database schema — no changes

## Files Modified
1. `src/components/workforce/EnhancedShiftWeekView.tsx` — add absence state, query exceptions, render badge + action button on shift cards, render dialog
2. `src/components/workforce/MobileShiftDayView.tsx` — same pattern: state, query, badge, dialog
3. `src/pages/workforce/Shifts.tsx` — day view: state, query, badge on employee badges, dialog

