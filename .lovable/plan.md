

# Fix: Shared Task Scoring + Late Flag Bug

## Two root causes found

### Issue 1: All completions marked as late
The database trigger `calculate_task_completion_late` compares `completed_at` against the task's **original `start_at` timestamp** (the date the task was first created). For recurring tasks, `start_at` might be `2025-12-01 06:00` — so every completion on any later date (e.g., Feb 5 at 06:10) is compared against a deadline of `2025-12-01 06:30` and flagged late.

**Evidence**: Task "Hats and Hair Nets" has `start_at = 2025-12-01 06:00`, `duration = 30min`, so `computed_deadline = 2025-12-01 06:30`. Completion on Feb 5 at 06:10 is marked late because `06:10 Feb 5 > 06:30 Dec 1`.

**Fix**: Update the trigger to use `occurrence_date + time_of_day(start_at)` as the deadline base instead of `start_at` directly. Then backfill all existing completions.

### Issue 2: Shared tasks counted on non-work days
The scoring logic in `useEmployeePerformance.ts` counts shared task occurrences for every day in the period, regardless of whether the employee had a shift. Bibek worked 20 days but is scored against all occurrence days.

**Fix**: In the shared task assignment loop (line ~448), only count an occurrence date if the employee had an approved shift on that date.

## Implementation

### 1. Database migration — Fix the late trigger
Update `calculate_task_completion_late()` to build the deadline from `occurrence_date + time_of_day(start_at)` instead of raw `start_at`:

```sql
CREATE OR REPLACE FUNCTION public.calculate_task_completion_late()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline timestamptz;
  v_tz TEXT := 'Europe/Bucharest';
BEGIN
  IF NEW.completed_late IS NOT NULL AND TG_OP = 'INSERT' AND NEW.completed_late != false THEN
    RETURN NEW;
  END IF;

  SELECT 
    CASE
      WHEN t.start_at IS NOT NULL AND t.duration_minutes IS NOT NULL THEN
        -- For recurring tasks: apply time-of-day from start_at to the occurrence_date
        timezone(v_tz, (
          NEW.occurrence_date || ' ' || 
          to_char(t.start_at AT TIME ZONE v_tz, 'HH24:MI:SS')
        )::timestamp) + (t.duration_minutes || ' minutes')::interval
      WHEN t.due_at IS NOT NULL THEN t.due_at
      ELSE NULL
    END
  INTO v_deadline
  FROM public.tasks t
  WHERE t.id = NEW.task_id;

  IF v_deadline IS NULL OR NEW.completed_at IS NULL THEN
    NEW.completed_late := false;
  ELSE
    NEW.completed_late := (NEW.completed_at > v_deadline);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

Then backfill all existing records with the corrected logic.

### 2. Frontend — Filter shared tasks by scheduled days
**File: `src/hooks/useEmployeePerformance.ts`** (line ~448 area)

Build a `Set<string>` of dates the employee has approved shifts, then only count shared task occurrences that fall on those dates:

```typescript
// Build set of dates employee is scheduled
const employeeShiftDates = new Set(
  employeeShifts.map(s => s.shift_date)
);

for (const [taskId, occurrenceDates] of sharedTaskOccurrences) {
  // ... existing location/role checks ...
  
  // Only count occurrences on days employee was scheduled
  for (const dateStr of occurrenceDates) {
    if (employeeShiftDates.has(dateStr)) {
      sharedTasksAssigned++;
    }
  }
}
```

### 3. Edge function — Same fix for snapshot
**File: `supabase/functions/snapshot-monthly-scores/index.ts`**

The monthly snapshot has the same issue — it doesn't filter shared tasks by shift days. Apply the same shift-date filtering logic there. (Currently it only counts direct tasks + completions, so this is lower priority but should be aligned.)

### Files changed

| File | Change |
|------|--------|
| New migration SQL | Fix `calculate_task_completion_late` trigger + backfill |
| `src/hooks/useEmployeePerformance.ts` | Filter shared task occurrences to scheduled work days only |
| `supabase/functions/snapshot-monthly-scores/index.ts` | Align snapshot with same shift-day filtering |

