

## Improve "Upcoming Audits" to Show This Week's Audits

### Current Behavior

The "Upcoming Audits" section shows the next 3 audits that aren't completed, regardless of date. This means old overdue audits from weeks ago (like the January ones in the screenshot) dominate the list, pushing out actually relevant upcoming work.

### Proposed Changes

**File: `src/components/staff/CheckerAuditsCard.tsx`**

Update the `upcomingAudits` filter logic to:

1. **Show only this week's audits** -- filter `scheduled_start` to be within the current week (Monday to Sunday)
2. **Sort by date ascending** -- nearest audit first, so the most urgent one is at the top
3. **Show a friendly empty state** when there are no audits this week: "No audits scheduled this week" instead of the generic "No upcoming audits scheduled"
4. **Drop old overdue audits** from this view -- audits from past weeks (like Jan 14, Jan 19) won't appear here since they fall outside the current week window

### What the User Will See

- If there are audits this week: up to 3 listed, sorted by time
- If none this week: a clean message saying "No audits this week"
- "View All" still navigates to the full audit list where they can see everything including overdue

### Technical Detail

Replace the `upcomingAudits` memo (lines 38-47) with:

```typescript
const upcomingAudits = useMemo(() => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });      // Sunday

  return scheduledAudits
    .filter((audit) => {
      const status = audit.status?.toLowerCase();
      if (status === "compliant" || status === "non-compliant" || status === "completed") return false;
      if (!audit.scheduled_start) return false;
      const date = parseISO(audit.scheduled_start);
      return date >= weekStart && date <= weekEnd;
    })
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    .slice(0, 3);
}, [scheduledAudits]);
```

Update the empty state text (line 178) to: `"No audits scheduled this week"`

Add `startOfWeek` and `endOfWeek` to the date-fns imports (line 9).

### What This Does NOT Change

- No database changes
- "View All" still shows the complete list including overdue
- Stats card (Scheduled / Completed / Drafts counts) remain unchanged
- No changes to other dashboard components

