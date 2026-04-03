

# Add Date Label to Top Performers Card

## Change

**`src/components/dashboard/WorkforceAnalytics.tsx`** (line 320)

Replace the generic `CardDescription` text:
```
Highest performing employees this period
```
with a dynamic label showing the actual date range:
```
{format(dateFrom, "MMM d")} – {format(dateTo, "MMM d, yyyy")}
```

This is a one-line change. The `dateFrom`/`dateTo` state variables and `format` from `date-fns` are already available in the component.

## Result
The Top Performers card will show e.g. "Mar 1 – Mar 31, 2026" so admins immediately know which period the scores cover.

