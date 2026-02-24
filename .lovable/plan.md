

## Fix: Midnight Wrap Bug in Shift Matching

### Root Cause

The `find_scheduled_shift_for_clockin` database function has a time arithmetic bug. When `end_time + grace_minutes` crosses midnight (e.g., 23:50 + 60 = 00:50 next day), the condition:

```sql
v_check_time <= (s.end_time + grace_interval)
```

...fails because PostgreSQL `time` comparisons are literal: `12:13 <= 00:50` evaluates to `FALSE`. This caused Iulian's 12:13 clock-in to be flagged as "unscheduled" even though his 10:00-23:50 shift was already assigned and approved 7 minutes earlier.

### Timeline of Events (Feb 24)

```text
10:06 UTC  - Iulian assigned to shift (10:00-23:50), auto-approved
10:13 UTC  - Iulian clocks in
             -> RPC: find_scheduled_shift_for_clockin called
             -> Local time: 12:13 (Europe/Bucharest, UTC+2)
             -> Shift window: 09:00 to 00:50 (end + 60min wraps past midnight)
             -> Check: 12:13 <= 00:50 -> FALSE (BUG!)
             -> Result: no shift found -> "unscheduled_shift" exception created
```

### The Fix

Update both overloads of `find_scheduled_shift_for_clockin` to handle the midnight wrap case. When `end_time + grace` wraps past midnight, the check should become: "check_time >= window_start OR check_time <= wrapped_window_end" instead of requiring both conditions simultaneously.

**Updated SQL condition:**

```sql
-- Old (broken for midnight wrap):
AND v_check_time >= (s.start_time - grace_interval)
AND v_check_time <= (s.end_time + grace_interval)

-- New (handles midnight wrap):
AND v_check_time >= (s.start_time - grace_interval)
AND (
  CASE 
    WHEN (s.end_time + grace_interval) < s.end_time  -- midnight wrap detected
    THEN true  -- if end wraps past midnight, any time after start is valid
    ELSE v_check_time <= (s.end_time + grace_interval)
  END
)
```

When `end_time + grace` is less than `end_time` itself, we know it wrapped past midnight. In that case, any time that's already past the start window is valid (the shift hasn't ended yet).

### Changes

| Area | What Changes |
|------|-------------|
| **Database migration** | Update both overloads of `find_scheduled_shift_for_clockin` to handle midnight time wrap in the end-time grace window |

### After the Fix

- The function will correctly match Iulian's 12:13 clock-in to his 10:00-23:50 shift
- Late-night shifts (e.g., ending at 23:00, 23:30, 23:50) will no longer produce false "unscheduled" exceptions when the grace window crosses midnight
- No frontend code changes needed -- the bug is entirely in the database function

