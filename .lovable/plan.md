

# Fix: Unscheduled Clock-in Approval Fails Before Opening Hours

## Problem
When approving Bogdan Rusu's unscheduled clock-in at 07:53, the system tries to create a shift starting at 07:53. A database trigger (`validate_shift_within_operating_hours`) rejects this because the location opens at 08:00. The error: *"Shift start time (07:53:00) is before location opens (08:00:00)"*.

It's normal for employees to arrive a few minutes early. The approval should not fail because of this.

## Solution
When creating a shift from an approved unscheduled clock-in, **clamp the shift start time** to the location's opening time if the clock-in happened before opening hours. The attendance log keeps the real 07:53 timestamp — only the shift record gets the adjusted time.

## Changes

### `src/hooks/useScheduleGovernance.ts`
In the `useResolveException` mutation (around line 530), after extracting `startTime` from the clock-in timestamp:

1. Query `location_operating_schedules` for the location + day of week
2. If `startTime < open_time`, set `startTime = open_time`
3. Proceed with shift creation as before

```
Logic flow:
  clock-in at 07:53, location opens at 08:00
  → startTime clamped to 08:00:00
  → shift created 08:00–16:00 (or actual checkout)
  → attendance_log still records 07:53 (untouched)
```

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useScheduleGovernance.ts` | Clamp shift start_time to location open_time when creating shift from approved unscheduled clock-in |

No database changes needed. The trigger stays as-is (it's a valid safety net for normal shift creation).

