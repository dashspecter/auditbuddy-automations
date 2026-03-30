

# Fix: Shift Scheduling Grid Not Showing Correct Vacation Days

## Problem
The scheduling grid uses `isWithinInterval(date, { start: start_date, end: end_date })` to check if an employee has time off on a given day. With the new specific-dates model, this is wrong — it treats the entire min→max range as time off, even for non-consecutive selections (e.g., employee selects Mar 3, 5, 7 but Mar 4 and 6 also show as time off).

## Fix
Update two functions in `EnhancedShiftWeekView.tsx` to check against the actual `time_off_request_dates` child rows instead of the date range:

### `getTimeOffForEmployeeAndDay` (line 332)
Instead of `isWithinInterval`, check if the day's date string exists in `req.time_off_request_dates`. Fall back to range check for legacy requests without child rows.

### `getTimeOffForLocationAndDay` (line 344)
Same change — use `time_off_request_dates` for matching, with range fallback.

## Also fix: `EmployeeMultiWeekView.tsx`
The `getTimeOffForDay` function (line ~108) uses the same `isWithinInterval` pattern and needs the same update.

## Scope

| File | Change |
|------|--------|
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Update `getTimeOffForEmployeeAndDay` and `getTimeOffForLocationAndDay` to use specific dates |
| `src/components/workforce/EmployeeMultiWeekView.tsx` | Update `getTimeOffForDay` to use specific dates |

