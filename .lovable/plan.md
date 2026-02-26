

# Fix Attendance Rate showing 0% on KPI card

## Root Cause
The attendance rate calculation in `CrossModuleStatsRow.tsx` (line 66-67) references **wrong field names**: `present_count` and `expected_count`. The materialized view actually returns `staff_checked_in` and `staff_scheduled`. Since the wrong fields are always undefined, it falls back to 0.

The popup (`AttendancePopup.tsx`) uses the correct field names, which is why it shows 69%.

## Changes

**`src/components/dashboard/CrossModuleStatsRow.tsx`** (lines 64-70)
- Change `d.present_count` → `d.staff_checked_in`
- Change `d.expected_count` → `d.staff_scheduled`

Also for both Training and Attendance: show "N/A" instead of "0%" when no data exists:
- `trainingCompliance`: return `null` when `assignments.length === 0`, display "N/A" with description "No assignments"
- `attendanceRate`: return `null` when stats are empty, display "N/A" with description "No data"

