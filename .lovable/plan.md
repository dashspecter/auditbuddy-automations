

# Fix: Broken RPC causing empty performance data

## Root Cause

The `calculate_location_performance_scores` RPC is **crashing with a SQL error**, which is why all performance pages show 0 staff and no data. The error:

```
function pg_catalog.extract(unknown, integer) does not exist
```

In the warning penalty calculation (line 404 of migration `20260302091508`):

```sql
EXTRACT(EPOCH FROM (v_today - se.event_date::date)) / (90 * 86400)
```

`v_today - se.event_date::date` returns an **integer** (number of days), not an interval. PostgreSQL cannot call `EXTRACT(EPOCH FROM integer)`.

Additionally, the second migration (`20260302094346`) created a **separate 4-parameter overload** (`p_company_id, p_location_id, p_start_date, p_end_date`) instead of replacing the broken 3-parameter version. The hook calls the 3-parameter version, which is still the broken one.

## Fix

### Database migration — Fix the warning penalty calculation

Replace the broken expression with simple integer arithmetic:

```sql
-- FROM (broken):
EXTRACT(EPOCH FROM (v_today - se.event_date::date)) / (90 * 86400)

-- TO (fixed):
(v_today - se.event_date::date)::numeric / 90
```

Since `v_today - se.event_date::date` already returns days as an integer, we just divide by 90 to get the decay fraction (0.0 to 1.0). No need for epoch conversion.

This fix applies to the 3-parameter version of the function that the hook actually calls. Also drop the orphaned 4-parameter overload to avoid confusion.

### No UI changes needed

The hook and all components are correct — they just need the RPC to stop crashing.

