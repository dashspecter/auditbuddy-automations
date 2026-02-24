
## Show Vacation/Time-Off in Location View

### Problem
When viewing the shift schedule in **Location mode**, vacation/time-off entries are not displayed. They only appear in the **Employee view**. Since managers typically work in the Location view when building schedules, they can't see which employees are on vacation -- leading to scheduling conflicts and confusion.

### Solution
Add a "Time Off" row below each location's "All shifts" row that shows employees on vacation for each day. This gives managers immediate visibility into who is unavailable when planning shifts.

### What It Will Look Like

```text
+------------------+--------+--------+--------+--------+
| Location Header  | Mon    | Tue    | Wed    | Thu    |
+------------------+--------+--------+--------+--------+
| All shifts       | Chef   | Chef   |        | Chef   |
|                  | 08-16  | 08-16  |        | 08-16  |
+------------------+--------+--------+--------+--------+
| Time Off         |        | Ala A. | Ala A. |        |  <-- NEW ROW
|                  |        | Vacation| Vacation|       |
+------------------+--------+--------+--------+--------+
```

### Changes

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

1. **Add a helper function** `getTimeOffForLocationAndDay(locationId, date)` that filters `timeOffRequests` to find employees whose `location_id` matches the given location and who have approved time off on that date.

2. **Add a "Time Off" row** right after the "All shifts" row (after line 1246) for each location. This row will:
   - Show each employee on vacation as a red-styled card (same visual as the employee view)
   - Display the employee name and request type (Vacation, Sick, etc.)
   - Be clickable to allow deleting the time-off entry (same as employee view behavior)
   - Only render when there are time-off entries for that location/day (no empty row clutter)

### Technical Details

- Employees are linked to locations via `employees.location_id`
- The `timeOffRequests` data is already loaded (line 126-129)
- The `employees` array is already loaded with all active employees (line 125)
- The existing `getTimeOffForEmployeeAndDay` helper and delete functionality will be reused
- No database changes needed -- this is purely a UI enhancement
- No impact on the Employee view -- it continues to work exactly as before
