

# Fix: RPC still crashing — type mismatch in warning query

## What's happening

The `calculate_location_performance_scores` RPC is **still crashing** every time it's called. The previous migration fixed the `EXTRACT(EPOCH FROM integer)` bug but introduced a new one on the same line block:

```
ERROR: operator does not exist: date >= text
```

**Line 410** of the current function:
```sql
AND se.event_date >= v_ninety_days_ago::text
```

`staff_events.event_date` is a `date` column. `v_ninety_days_ago` is a `DATE` variable. Casting a date to `::text` then comparing `date >= text` is invalid in PostgreSQL. This crashes the entire function, returning zero results for every location.

## Fix

One-line change in a new database migration — replace `v_ninety_days_ago::text` with just `v_ninety_days_ago`:

```sql
CREATE OR REPLACE FUNCTION public.calculate_location_performance_scores(...)
-- Everything identical to current version EXCEPT line 410:
-- FROM:  AND se.event_date >= v_ninety_days_ago::text
-- TO:    AND se.event_date >= v_ninety_days_ago
```

This is a `CREATE OR REPLACE` of the same 3-parameter function — no signature change, no overload issues.

## No other changes needed

The UI code, hooks, and edge function are all correct. The only problem is this single type cast in the SQL function preventing any data from returning.

