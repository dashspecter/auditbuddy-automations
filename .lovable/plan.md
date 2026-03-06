

# Why "Today's Audits" Shows Nothing on Mobile

## Root Cause

The calendar and mobile command center use **different data sources** and **different logic**:

**Calendar** combines THREE sources:
1. `location_audits` with `scheduled_start` (pre-generated audits)
2. `scheduled_audits` table (one-time scheduled)
3. `recurring_audit_schedules` — **expanded client-side** into virtual occurrences

The audits you see on Mar 6 (LBFC Timpuri Noi, LBFC Mosilor) come from **`recurring_audit_schedules`** — they have `recurrence_pattern: 'every_4_weeks'` with start dates in mid/late February. The calendar expands these into future dates client-side, landing some on today.

**Mobile command center** only queries `scheduled_audits` table with `scheduled_for` matching today. There are **zero rows** in that table for today. It also never looks at `recurring_audit_schedules` at all.

So the calendar shows audits; mobile does not. Both are "correct" given their own logic, but the mobile view is incomplete.

## Fix

The mobile `useTodayScheduledAudits` needs to also expand `recurring_audit_schedules` for today, using the same recurrence logic the calendar uses.

### Changes

**`src/hooks/useMobileCommandData.ts`** — `useTodayScheduledAudits`:

1. Keep the existing `scheduled_audits` query (for one-time scheduled audits)
2. Add a second query: fetch all active `recurring_audit_schedules` for the company
3. For each recurring schedule, compute whether today falls on a valid occurrence date (using the same `start_date`, `recurrence_pattern`, `day_of_week` logic as the calendar)
4. If today matches, add it to the results as a `ScheduledAuditItem`
5. Merge both lists, deduplicating by location+template if a `location_audits` entry already exists for today

**No other files change** — the `TodayAuditsSection` component already renders `ScheduledAuditItem[]` correctly.

### Recurrence matching logic (extracted from calendar):
```text
For each recurring_audit_schedule:
  - start from start_date, advance by pattern (daily/weekly/every_4_weeks/monthly)
  - check if today's date is hit
  - if yes → include as a scheduled audit item with start_time
```

This is a pure client-side computation over a small dataset (20 recurring schedules).

| File | Change |
|------|--------|
| `src/hooks/useMobileCommandData.ts` | Add recurring schedule expansion in `useTodayScheduledAudits` |

