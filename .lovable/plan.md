

# Timezone Bug in Staff Schedule — Missing Shifts

## Problem
Serdar's Sunday Mar 8 shift is missing from the staff schedule page but visible on the home page. This is a **timezone bug**.

Line 243-244 in `loadWeekShifts` uses `weekEnd.toISOString().split('T')[0]` to build the date range. `toISOString()` converts to UTC — in Romania (UTC+2), midnight Mar 8 local time becomes `2026-03-07T22:00:00Z`, so `split('T')[0]` produces `"2026-03-07"` instead of `"2026-03-08"`. The last day of the week is silently excluded.

The location schedule query (line 149-150) already does this correctly using `format(weekStart, "yyyy-MM-dd")`.

## Fix — `src/pages/staff/StaffSchedule.tsx`, lines 243-244

Replace:
```typescript
.gte("shifts.shift_date", weekStart.toISOString().split('T')[0])
.lte("shifts.shift_date", weekEnd.toISOString().split('T')[0])
```

With:
```typescript
.gte("shifts.shift_date", format(weekStart, "yyyy-MM-dd"))
.lte("shifts.shift_date", format(weekEnd, "yyyy-MM-dd"))
```

`format()` from date-fns uses local time, producing the correct date string regardless of timezone. Single file, 2-line change.

