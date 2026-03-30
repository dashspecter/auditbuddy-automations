

# Fix: Vacation Days Not Appearing in Shift Scheduling

## What You See
The scheduling grid in Location view has a "Time Off" row that appears below the shifts for each location — showing employee names with a red background on days they have approved time off. However, it's currently not showing because of **two bugs**:

## Bug 1: Date Range Query Is Wrong
The `useTimeOffRequests` hook filters with `start_date >= weekStart AND end_date <= weekEnd`. This only fetches requests **entirely contained** within the displayed week. A request spanning Mar 25–Apr 2 would NOT appear when viewing Mar 30–Apr 5.

**Fix**: Change to overlap logic: `start_date <= weekEnd AND end_date >= weekStart`. This catches any request that touches the displayed week.

## Bug 2: Location Matching Is Too Restrictive
The "Time Off" row only shows employees whose **primary `location_id`** matches the selected location. But employees often work at locations different from their primary assignment (e.g., they have shifts at LBFC Amzei but their profile says a different location).

**Fix**: Also consider employees who have shifts at the location during the displayed period, not just those with a matching `location_id`.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useTimeOffRequests.ts` | Fix date overlap query: `lte("start_date", endDate)` + `gte("end_date", startDate)` |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Expand `getTimeOffForLocationAndDay` to include employees with shifts at the location, not just primary `location_id` match |

## Result
After the fix, the "Time Off" row will correctly appear under each location showing approved vacation days with employee names in red badges — exactly matching the dates the employee selected and the manager approved.

