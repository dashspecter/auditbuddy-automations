

## Fix Time Format Inconsistency on Staff Tasks Page

### What's Happening Now

The times displayed on the "My Tasks" upcoming section are actually **calculated correctly**:

- "Starts 6:44 PM" with "Available at 18:14" means unlock = 18:44 - 30 min = 18:14 (correct math)
- The 30-minute unlock window (configurable per task via `unlock_before_minutes`) is applied correctly

### The Problem

The **time formats are inconsistent**, which makes things look wrong:
- "Starts" uses **12-hour format**: `6:44 PM`
- "Available at" uses **24-hour format**: `18:14`

This mixing of formats is confusing and makes users question whether the times are correct.

### The Fix

Standardize both times to the **same format**. Since the app targets a Romanian audience (Europe/Bucharest timezone), 24-hour format is more natural. Both "Starts" and "Available at" should use `HH:mm` (24-hour).

### Technical Changes

**File: `src/pages/staff/StaffTasks.tsx`** (line ~800)

Change the "Starts" time format from 12-hour to 24-hour:

```
// Before
format(new Date(task.start_at), "h:mm a")

// After  
format(new Date(task.start_at), "HH:mm")
```

This change applies to the upcoming tasks section where both "Starts" and "Available at" are shown together.

Also apply the same fix to the active tasks expanded details section (line ~708) for consistency.

### Result

After the fix, the display will read:
- "Starts: 18:44 - 120 min to complete" with "Available at 18:14" -- both in 24h format, clearly showing the 30-minute difference.
