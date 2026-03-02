

# Fix: Punctuality should reflect actual attendance

## Problem
Punctuality score starts at 100 and only deducts for late check-ins. An employee with 0 attendance (never clocked in) has 0 late records, resulting in a paradoxical 100% punctuality score.

## Solution
Punctuality should only apply to shifts the employee actually worked. The formula should be:

**If shifts_worked = 0 → punctuality_score = 0 (and punctuality_used = false)**

Specifically, in the RPC at lines 293-301:
```sql
-- Current (broken):
v_punctuality_used := v_shifts_scheduled > 0;

-- Fixed:
v_punctuality_used := v_shifts_worked > 0;
```

This way:
- Employee with 0 attendance → punctuality is unused (excluded from effective score average)
- Employee who worked all shifts and was never late → punctuality = 100
- Employee who worked some shifts and was late → punctuality deducts normally

## Files to modify
1. **Database migration** — Update `calculate_location_performance_scores` RPC: change `v_punctuality_used` condition from `v_shifts_scheduled > 0` to `v_shifts_worked > 0`
2. **`supabase/functions/snapshot-monthly-scores/index.ts`** — Mirror the same fix: `punctualityUsed` should check `worked > 0` instead of `scheduled > 0`

## What stays the same
- All UI components, hooks, and interfaces — no changes needed

