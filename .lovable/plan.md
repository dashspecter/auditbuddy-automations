

# Multi-Week Employee Schedule View

## Concept

A **per-employee** multi-week view — not expanding the full team grid. When a manager clicks on an employee row (or selects from a dropdown), a dedicated panel/dialog opens showing that single employee's schedule across 2 or 4 weeks, with the ability to create/edit/delete shifts directly in that view.

## UX Flow

```text
Team Grid (existing)
  └─ Click employee name/avatar → Opens EmployeeMultiWeekView
      ┌─────────────────────────────────────────────────┐
      │ [◀] Maria Popescu — 4 Weeks [▶]  [2W] [4W]     │
      ├─────────────────────────────────────────────────┤
      │       Mon  Tue  Wed  Thu  Fri  Sat  Sun         │
      │ W13 │ 8-16 ·   8-16  ·  8-16  ·    ·           │
      │ W14 │ 8-16 ·   8-16  ·  8-16  ·    ·           │
      │ W15 │  ·   ·    ·    ·   ·    ·    ·   ← empty  │
      │ W16 │  ·   ·    ·    ·   ·    ·    ·            │
      └─────────────────────────────────────────────────┘
      Click any cell → opens EnhancedShiftDialog (create/edit)
      Existing shifts show role badge + time
      Time-off days highlighted
```

## Implementation

### 1. New Component: `EmployeeMultiWeekView.tsx`

A dialog/sheet component that receives an `employeeId` and renders:
- **Header**: Employee name, avatar, role, week-span toggle (2W / 4W)
- **Grid**: Rows = weeks (W13, W14...), Columns = Mon–Sun
- **Cells**: Show existing shifts (role badge + time), time-off indicators, click-to-create
- **Navigation**: Forward/back arrows to shift the window
- Uses existing `useShifts` hook with the employee's location + expanded date range
- Filters shifts client-side by `staff_id` matching the selected employee
- Also queries `useTimeOffRequests` for the same range to show unavailability

### 2. Entry Point in `EnhancedShiftWeekView.tsx`

- Add a click handler on employee name/avatar in the grid rows
- Opens `EmployeeMultiWeekView` as a `Sheet` (slide-in panel from right)
- Passes `employeeId`, `employeeName`, `currentWeekStart` as starting point

### 3. Shift Creation from Multi-Week View

- Clicking an empty cell opens the existing `EnhancedShiftDialog` pre-filled with:
  - The employee (pre-selected, locked)
  - The date (from the cell's week-row + day-column)
  - Location (from context or employee's default)
- On shift creation, the multi-week view auto-refreshes via query invalidation

### 4. Data Fetching

- Reuse `useShifts(locationId, startDate, endDate)` with a wider date range (14 or 28 days)
- Filter returned shifts by `staff_id === employeeId` on the client
- Reuse `useTimeOffRequests(startDate, endDate)` filtered by employee

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/workforce/EmployeeMultiWeekView.tsx` | **NEW** — per-employee multi-week grid sheet |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Add click handler on employee rows to open the new sheet |

No backend changes, no new hooks, no schema changes. All data already available via existing queries.

