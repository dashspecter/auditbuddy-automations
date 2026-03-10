

# Fix Misleading "Overdue" Countdown for In-Progress Tasks

## Problem
The kiosk task countdown badge uses `formatCountdown(task.start_at)`. Once a task's start time passes, `differenceInMinutes` goes negative, and the function returns "Overdue" — even though the task has a `duration_minutes` window and is still within its active period.

Example: "Completare termograme - dimineata" starts at 10:30 with 60min duration (deadline 11:30). At 10:40, the countdown shows "Overdue" instead of showing ~50 minutes remaining.

## Solution

### `src/components/kiosk/KioskDashboard.tsx`

1. **Change countdown target**: Instead of `formatCountdown(task.start_at)`, compute the **deadline** using `getTaskDeadline(task)` and count down to that.

2. **Three states for the badge**:
   - **Before start**: Show countdown to `start_at` (e.g., "19m 19s") — keeps current behavior for upcoming tasks
   - **In progress** (past start, before deadline): Show remaining time to deadline (e.g., "⏱ 50m left")
   - **Past deadline**: The existing `isOverdue` check already handles this with the red "⚠ OVERDUE" badge

3. Update `formatCountdown` (or add inline logic at line ~912) to:
   - If `start_at` is in the future → countdown to start_at (current behavior)
   - If `start_at` is past but deadline is future → countdown to deadline with "left" suffix
   - If deadline is past → already handled by `isOverdue` branch above

### Files Changed

| File | Change |
|---|---|
| `src/components/kiosk/KioskDashboard.tsx` | Use deadline instead of start_at for countdown when task is in-progress |

