

## Root Cause

The Employee Performance page and all dashboard cards use **`useEmployeePerformance`** — a client-side hook that runs ~10 separate database queries and computes scores in JavaScript. The RPC `calculate_location_performance_scores` was fixed (task caps, individual tasks, guest workers, effective scoring), but **the UI never calls the RPC**. It uses the old client-side logic which still has the original bugs.

## Plan: Switch `useEmployeePerformance` to call the server RPC

### Step 1: Rewrite `useEmployeePerformance` hook
**File:** `src/hooks/useEmployeePerformance.ts`

Replace the ~500-line client-side calculation with a thin wrapper that:
1. Fetches all company locations (from `useLocations` or a direct query)
2. If `locationId` is provided, calls `calculate_location_performance_scores` once
3. If no `locationId` (all locations mode), calls the RPC once per location and merges results
4. Maps the RPC response to the existing `EmployeePerformanceScore` interface (same fields, so all consumers keep working)
5. Sets `warning_contributions` and `warning_monthly_caps` to empty defaults (the RPC doesn't return these detail fields, but they're only used in the expanded warning detail section which can degrade gracefully)

This eliminates: the individual task exclusion bug, task score inflation, guest worker invisibility, and scoring algorithm mismatch — all in one change, since the RPC already has all 4 fixes.

### Step 2: Keep `usePerformanceLeaderboard` unchanged
It already wraps `useEmployeePerformance`, so it automatically gets correct data.

### Step 3: Keep `effectiveScore.ts` unchanged  
The `computeEffectiveScore` function reads `shifts_scheduled`, `tasks_assigned`, `tests_taken`, `reviews_count` to determine `_used` flags. Since the RPC now returns 0 for unused components (not 100), the effective score computation will work correctly — components with 0 assigned will be marked as unused.

### Step 4: Individual consumer pages  
All 7 consumers (`EmployeePerformance.tsx`, `EmployeePerformanceDashboard.tsx`, `CompanyPerformanceOverview.tsx`, `CrossModuleStatsRow.tsx`, `AttentionAlertBar.tsx`, `WorkforceAnalytics.tsx`, `WorkforceScorePopup.tsx`, `StaffHome.tsx`, `StaffProfile.tsx`, `StaffScoreBreakdown.tsx`, `EmployeePerformanceDetail.tsx`) use the same `useEmployeePerformance` or `usePerformanceLeaderboard` hook — no changes needed.

### Performance consideration
The RPC is SECURITY DEFINER and fast (~5-50ms per location). Even with 10 locations called in parallel, total time is under 200ms, which is comparable to or faster than the current 10-query client-side approach.

### What stays the same
- `EmployeePerformanceScore` interface (no changes)
- `EffectiveEmployeeScore` interface and `computeEffectiveScore` (no changes)
- All UI components (no changes)
- The RPC function (already deployed with all 4 fixes)

