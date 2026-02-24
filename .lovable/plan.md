

## Fix: Additional Daily Times Not Persisting (Single Additional Time)

### Root Cause

The save logic requires **at least 2** additional time slots before persisting `recurrence_times` to the database. When a user adds only **1** additional time (e.g., 04:00 PM), the array has length 1, which fails the `>= 2` check, so it saves `null` -- effectively discarding the user's input.

The same threshold exists in the occurrence engine, which skips multi-slot expansion unless there are `> 1` entries.

### The Fix

Change the threshold from 2 to 1 across all relevant files, so that even a single additional daily time is saved and respected:

### Changes

**1. `src/pages/TaskNew.tsx`** (task creation)
- Line 104: Change `recurrenceTimes.length >= 2` to `recurrenceTimes.length >= 1`
- Line 294: Change the success message condition from `>= 2` to `>= 1`
- Line 297: Remove or adjust the "Add at least one more" hint (no longer needed with 1 entry)

**2. `src/pages/TaskEdit.tsx`** (task editing)
- Line 168: Change `recurrenceTimes.length >= 2` to `recurrenceTimes.length >= 1`

**3. `src/lib/taskOccurrenceEngine.ts`** (occurrence generation)
- Line 491: Change `recurrence_times.length > 1` to `recurrence_times.length >= 1` so that even a single additional time triggers multi-slot expansion

### Result

After these changes:
- Adding 1 additional time (e.g., 16:00) to a task with start_at 08:00 will create 2 daily occurrences
- The data will persist correctly and display when reopening the task for editing
- Existing tasks with 2+ additional times continue to work identically

