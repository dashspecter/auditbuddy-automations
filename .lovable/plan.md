

# Smarter "Needs Attention" Alert Bar

## Problem

The current alert bar shows **all-time cumulative counts**:
- **73 Overdue Tasks** = every task ever created that's past its deadline and not completed — including tasks from months ago that are no longer relevant
- **41 At-Risk Employees** = scored over a 1-month lookback, which is better but still noisy

These numbers are overwhelming and not actionable. A manager seeing "73 overdue tasks" feels alarm fatigue rather than urgency.

## Proposed Approach: Rolling 7-Day Window + "New This Week" Delta

Instead of showing all-time accumulation, the alert bar should focus on **what's actionable right now**:

### Overdue Tasks
- **Show**: Tasks that became overdue in the last 7 days (their deadline fell within the past 7 days and they're still not completed)
- **Label change**: "73 Overdue Tasks" → e.g. "12 Newly Overdue Tasks" 
- Old tasks that have been overdue for weeks are still visible in the Tasks module, but they shouldn't clutter the dashboard alert — they're already known

### At-Risk Employees  
- **Show**: Employees whose score dropped below 50 in the **current scoring period** (last 30 days is fine, but only show the count if it **changed** compared to last period)
- **Simpler alternative**: Just scope to the dashboard's selected date range (already passed as `dateFrom`/`dateTo` props but not used for workforce)

### Overdue Audits
- Already respects `dateFrom`/`dateTo` — this one is fine

### Open CAs
- These are genuinely open items that need resolution — all-time count makes sense here, no change needed

## Changes

### `src/components/dashboard/AttentionAlertBar.tsx`
- **Overdue Tasks**: Filter `useTaskStats` by a 7-day window. Since `useTaskStats` fetches all tasks, add client-side filtering: only count tasks where the deadline (due_at or start_at+duration) falls within the last 7 days AND status is still pending/in_progress
- **At-Risk Employees**: Use the dashboard's `dateFrom`/`dateTo` for the performance leaderboard lookup instead of hardcoded `subMonths(now, 1)` — this way it respects the date picker
- **Label updates**: "Overdue Tasks" → "Newly Overdue (7d)", or keep "Overdue Tasks" but with the scoped count

### `src/hooks/useTasks.ts` — `useTaskStats`
- Add an optional `since?: Date` parameter to scope the overdue count
- When provided, only count tasks whose deadline falls after `since` as "overdue" — older ones are excluded from the count (they're still overdue, just not surfaced in the alert)

### No database changes needed
All filtering is client-side on already-fetched data.

## Files to Change
- `src/hooks/useTasks.ts` — Add date-scoped overdue counting to `useTaskStats`
- `src/components/dashboard/AttentionAlertBar.tsx` — Use 7-day window for tasks, respect dateFrom/dateTo for workforce scores, update labels

