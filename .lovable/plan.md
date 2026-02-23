

## Improve "My Audits" - Current Week Focus

### Problem

Right now the completed audits section shows a flat "Recently Completed (10)" list with no week grouping. Users have to scan dates manually to find this week's work, which is inefficient.

### What Changes

Reorganize the completed audits into week-based sections, with **This Week** prominently displayed first:

```text
OVERDUE (if any)
TODAY (scheduled)
TOMORROW (scheduled)
UPCOMING (scheduled)

--- THIS WEEK'S COMPLETED (4) ---        <-- new, prominent
  LBFC Obor · Feb 23 · 100% · Compliant
  LBFC Obor · Feb 22 · 85%  · Compliant
  ...

--- LAST WEEK (6) ---                    <-- new, collapsed by default
  LBFC Mosilor · Feb 17 · 100% · Compliant
  ...

--- OLDER ---                            <-- new, collapsed by default
  ...
```

### UX Improvements

1. **"This Week" section** always visible at top of completed audits, with a subtle highlight/accent border to draw attention
2. **Week summary badge** next to the heading showing quick stats (e.g., "4 audits, avg 96%")
3. **Last Week and Older sections** use a `Collapsible` component -- collapsed by default to reduce clutter, expandable on tap
4. **Empty state for This Week**: If no audits completed yet this week, show an encouraging message like "No audits completed this week yet"

### Technical Details

**File**: `src/pages/staff/StaffLocationAudits.tsx`

1. **Update the `completedAudits` memo** (lines 63-70): Instead of slicing to 10, group all completed audits into three buckets:
   - `thisWeek`: audits where `audit_date` or `created_at` falls within the current Mon-Sun week
   - `lastWeek`: audits from the previous Mon-Sun week
   - `older`: everything else (limit to 10)

2. **Add week boundary helpers**: Use `startOfWeek` and `endOfWeek` from `date-fns` (already imported) with `{ weekStartsOn: 1 }` for Monday start.

3. **Replace the single "Recently Completed" section** (lines 280-289) with three sections:
   - "This Week" -- always rendered, accent-colored heading, shows empty state if zero
   - "Last Week" -- wrapped in `Collapsible` (from radix, already in deps), collapsed by default
   - "Older" -- wrapped in `Collapsible`, collapsed by default

4. **Add average score** next to each week heading: compute the mean score of audits in that group and display as a small badge.

No database changes. No new dependencies. One file modified (~60 lines changed).

