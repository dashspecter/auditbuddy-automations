

# Show Today's Due Tasks by Location (instead of all active tasks)

## Why it makes sense

Showing 73 "Active Tasks" in a weekly command center is noise — you can't act on it. Showing **today's due tasks grouped by location** is actionable: you see which locations have outstanding work right now.

## Changes

### 1. Data: `useMobileCommandData.ts` — `useWeeklyAuditSummary`

Replace the single `openTasks` count with a structured list:

- Query `tasks` where `status = 'pending'` and `due_at` falls within today
- Join with `task_locations` to get location assignments
- Also fetch location names from `locations` table
- Return as `todayTasks: { locationName: string; count: number }[]` plus a `todayTasksTotal` number
- For tasks with no location (global), group under "All Locations"

Update the `WeeklyAuditSummaryData` type accordingly.

### 2. UI: `WeeklyAuditSummary.tsx`

- The KPI tile still shows a number (today's due count), but label changes to "Due Today"
- Below the KPI row, if there are due tasks, show a compact breakdown by location:
  ```
  LBFC Amzei — 4 tasks
  Bab's Obor — 2 tasks
  ```

### Files

| File | Change |
|------|--------|
| `src/hooks/useMobileCommandData.ts` | Replace `openTasks` count query with today's due tasks + location grouping via `task_locations` join |
| `src/components/mobile-command/WeeklyAuditSummary.tsx` | Update KPI label, add per-location task breakdown below |

No database changes needed.

