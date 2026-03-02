

# Fair Share Scoring Implementation Plan

## Problem
Shared task scoring currently uses `task_completions` as the denominator. If nobody completes a task, it's invisible. Employee A doing 8 of 10 scheduled tasks scores 100% instead of 80%. Employee B doing 0 gets 0% but isn't penalized for the 2 tasks nobody did.

## Solution: Time-Aware Fair Share Model

For each shared task occurrence on a given day, determine which employees' shifts overlap with the task's scheduled time, and split the task proportionally among them. This becomes the denominator.

```text
Example: 10 shared tasks, 2 employees on shift
Fair share per employee = 10 / 2 = 5
Employee A completes 8 → min(100, 8/5 × 100) = 100%
Employee B completes 0 → 0/5 × 100 = 0%

With time-awareness:
Task at 08:00 → only morning-shift employees are eligible
Task at 18:00 → only evening-shift employees are eligible
```

## Implementation Steps

### Step 1: SQL Helper Function — `task_occurs_on_date`

Create a `STABLE SECURITY DEFINER` function that checks if a task recurs on a given date, implementing the same recurrence logic as the TypeScript `taskOccurrenceEngine`:

- **daily**: `(target_date - task_created) % interval = 0`
- **weekly + days_of_week**: weekday match + week interval check using `differenceInCalendarWeeks` equivalent
- **weekly (simple)**: same weekday as creation + week interval
- **monthly**: same day-of-month
- **weekdays**: Mon-Fri only
- **non-recurring**: exact date match on `created_at`
- Respects `recurrence_end_date` boundaries

Also counts `recurrence_times` entries: a task with 3 time slots (08:00, 12:00, 18:00) counts as 3 occurrences on that day.

### Step 2: Update `calculate_location_performance_scores` RPC

Replace the **SHARED TASKS** section (lines 137-206) and **INDIVIDUAL TASKS** section (lines 208-276):

**New shared task logic:**
```text
v_fair_share_total := 0 (NUMERIC)

For each shift day the employee worked at this location:
  For each shared task at this location matching employee's role:
    IF task_occurs_on_date(task, shift_date) THEN:
      -- Count time slots (recurrence_times or 1)
      time_slots := array_length(task.recurrence_times) OR 1
      
      For each time slot:
        -- Count eligible employees: those with approved shifts at this 
        -- location on this date whose shift window covers the task time
        eligible_count := employees whose shift start_time <= task_time 
                         AND shift end_time >= task_time
                         AND matching role
        
        -- If task has no specific time, fallback: all on-shift employees
        IF no task time THEN eligible_count = all on-shift matching role
        
        IF employee's shift covers this time slot:
          v_fair_share_total += 1.0 / eligible_count

v_shared_tasks_assigned := ROUND(v_fair_share_total)
```

The completed count stays the same (actual completions by this employee from `task_completions`).

Task score: `LEAST(100, (completions_on_time / fair_share) * 100)`

**Same approach for individual tasks** — but each individual task counts as 1 full assigned per eligible employee (no division), since each employee must complete it independently.

**Return type change**: `tasks_assigned` stays INTEGER (we `ROUND` the fair share sum).

### Step 3: Update `snapshot-monthly-scores` Edge Function

Mirror the fair-share logic in TypeScript in `supabase/functions/snapshot-monthly-scores/index.ts`:

- Fetch shared tasks with recurrence fields (`recurrence_type`, `recurrence_interval`, `recurrence_days_of_week`, `recurrence_end_date`, `recurrence_times`, `start_at`)
- Fetch shifts with `start_time` and `end_time`
- Implement `taskOccursOnDate()` TypeScript helper (same recurrence rules)
- For each employee's shift days, compute scheduled tasks, count eligible employees per task per time slot, sum fair shares
- Use fair share as denominator

### Step 4: No Frontend Changes

The UI reads `tasks_assigned`, `tasks_completed_on_time`, and `task_score` from the RPC. The fair-share change is entirely server-side. All views (dashboard, kiosk, mobile, leaderboard, staff profile) automatically reflect the new scoring.

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | `task_occurs_on_date()` helper + updated `calculate_location_performance_scores` RPC with time-aware fair share |
| `supabase/functions/snapshot-monthly-scores/index.ts` | Mirror time-aware fair share logic, fetch recurrence fields + shift times |

## What Does NOT Change
- Direct task scoring (assigned_to = specific employee) — unchanged
- Individual task completions counting — unchanged  
- Attendance, punctuality, tests, reviews, warnings — all unchanged
- All UI components — unchanged
- `taskOccurrenceEngine.ts`, `kioskEffectiveScore.ts` — unchanged
- Task completion flow (`complete_task_guarded`) — unchanged

## Testing Plan
After implementation:
1. Call the RPC for a location with shared tasks and verify fair-share denominators are correct
2. Verify kiosk leaderboard displays correct scores
3. Verify dashboard workforce analytics
4. Verify staff profile performance tab  
5. Verify mobile staff view
6. Check that employees with no completions still get penalized when tasks were scheduled
7. Check that partial-shift employees only get fair share for tasks during their shift window

