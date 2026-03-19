

# Fix: Workforce Score Still Shows 0% — Missing `performance_reviews` Table

## Findings

### Workforce Score (0% / 0 employees) — BROKEN
The RPC `calculate_location_performance_scores` crashes at line 340 because it queries `performance_reviews`, a table that **does not exist** in the database. This is the third stale reference in the same function (after `task_completions` columns and `test_attempts`). Every call returns an error, so the hook gets an empty array → 0%.

The fix: since the `performance_reviews` feature hasn't been built yet, wrap that query in an exception handler so it gracefully returns 0 reviews instead of crashing the entire function.

### Open CAs (0) — CORRECT
The database has 24 corrective actions, **all with status "closed"**. Zero are "open" or "in_progress". The card showing 0 is accurate.

## Fix

**Single database migration** to update the RPC: wrap the `performance_reviews` query (lines 340-344) in a `BEGIN...EXCEPTION` block that catches the missing table error and defaults to 0 reviews / 0 score. This makes the function resilient without needing to create the table.

```sql
-- Inside the function, replace lines 340-344 with:
BEGIN
  SELECT COUNT(*), COALESCE(AVG(pr.overall_score), 0)
  INTO v_reviews_count, v_avg_review_score
  FROM performance_reviews pr
  WHERE pr.employee_id = v_emp.id
    AND pr.review_date >= p_start_date AND pr.review_date <= p_end_date;
EXCEPTION WHEN undefined_table THEN
  v_reviews_count := 0;
  v_avg_review_score := 0;
END;
```

Similarly, wrap the `warnings` query (lines 402-406) in the same pattern as a preventive measure.

### Files to Change

| File | Change |
|------|--------|
| Database migration | `CREATE OR REPLACE FUNCTION calculate_location_performance_scores` with exception handlers for missing tables |

