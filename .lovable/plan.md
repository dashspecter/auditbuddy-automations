

## Add Role and Employee Filters to the Task List View

### What
Add two additional filter dropdowns next to the existing Location filter on the Tasks page: **Role** and **Employee**. These filters will apply globally across all tabs (List, Today, Tomorrow, Pending, Overdue, Completed) -- matching the existing location filter behavior.

### Why
With 64+ tasks, finding specific ones is difficult. Filtering by role (e.g., "Cook") or by assigned employee lets managers quickly scope the view to what matters, especially in multi-location operations.

### UI Layout
The filter bar (currently just Location) will expand to include three dropdowns in a row:

```text
[Location: All Locations v] [Role: All Roles v] [Employee: All Employees v] [Clear]
```

- Each dropdown shows "All ..." by default
- The Clear button appears when any filter is active (not just location)
- Filters stack vertically on mobile for responsiveness

### Changes

**File: `src/pages/Tasks.tsx`** (single file)

1. **Add imports**: `useEmployeeRoles` hook (already used elsewhere in the codebase)

2. **Add state variables**:
   - `selectedRoleId` (default: `"all"`)
   - `selectedEmployeeId` (default: `"all"`)

3. **Fetch data**: Call `useEmployeeRoles()` to get the roles list. Employees are already fetched via `useEmployees()`.

4. **Extend `filterByLocation` to a unified filter function** that checks:
   - Location match (`task.location_id`)
   - Role match (`task.assigned_role_id`)
   - Employee match (`task.assigned_to`)

5. **Add two new Select dropdowns** in the filter bar next to the location filter

6. **Update Clear button** to reset all three filters when clicked, and show when any filter is active

### Technical Details

- Reuses existing `useEmployeeRoles` hook (same as TaskNew, TaskEdit, AllTasksOpsDashboard)
- Reuses existing `useEmployees` hook (already imported in Tasks.tsx)
- Client-side filtering only -- no new queries needed since all task data already includes role and employee info
- Stats cards will also reflect the combined filters (same pattern as current location filtering)
- The role filter shows `employee_roles` (operational roles like Cook, Barista) which map to `task.assigned_role_id`
- The employee filter shows employees from `useEmployees()` which map to `task.assigned_to`

