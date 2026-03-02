

# Fix: Sorin Comoli appearing twice in Performance Leaderboard

## Root Cause

The duplication comes from the **"all locations" code path** in `useEmployeePerformance.ts`. When no specific location is selected, the hook calls the RPC once per location in parallel, then merges with `results.flat()`. The comment on line 163 says "Merge and deduplicate" but **no deduplication actually happens**. If an employee's home location is Location A but they also have approved shifts at Location A (matching both the `e.location_id` check AND the guest-worker subquery), or if cached results persist across filter changes, duplicates appear.

Even when a specific location is selected, the RPC returns one row — but stale React Query cache from a previous "all locations" query can cause the UI to briefly show duplicates.

## Fix

Two layers of protection:

### 1. `useEmployeePerformance.ts` — Deduplicate after merging all-locations results

After `results.flat()` (line 163-164), deduplicate by `employee_id`, keeping the entry with the highest `overall_score`:

```typescript
const seen = new Map();
for (const score of results.flat()) {
  const existing = seen.get(score.employee_id);
  if (!existing || score.overall_score > existing.overall_score) {
    seen.set(score.employee_id, score);
  }
}
const allScores = Array.from(seen.values());
allScores.sort((a, b) => b.overall_score - a.overall_score);
```

### 2. `EmployeePerformanceDashboard.tsx` — Deduplicate in `computeEffectiveScores` input

Before computing effective scores (line 134-136), deduplicate `rawAllScores` by `employee_id` as a safety net, so even with cache artifacts, the UI never shows the same person twice.

### No database changes needed

The RPC itself is correct and returns unique rows per employee.

