

## Fix: Unify Performance Scores Across All Mobile Views

### The Problem

User Iulian sees **three different scores** on three screens:
- **Home page**: 86.8 (inflated -- counts components with no data as 100%)
- **Score Breakdown**: 78.0 (correct -- only counts components with actual data)
- **Profile page**: -- (broken -- the query never runs because no date range is passed)

### Root Causes

1. **Home page** reads `overall_score` which averages all 5 components equally, defaulting unused ones (like Tasks) to 100. This artificially inflates the score.
2. **Profile page** calls `useEmployeePerformance()` with no date arguments. The query requires both `startDate` and `endDate` to run, so it returns nothing.
3. Only the Score Breakdown page uses the correct `computeEffectiveScore()` function.

### The Fix

#### 1. `src/pages/staff/StaffHome.tsx` -- Use effective score

- Add the month date range (already exists) and `computeEffectiveScore` import
- Replace `overall_score` lookup with `computeEffectiveScore()` to get the real effective score
- The "My Score" card will now show the same number as the Score Breakdown page

#### 2. `src/pages/staff/StaffProfile.tsx` -- Add date range and use effective score

- Add `useMemo` for month date range (same pattern as Home and Score Breakdown)
- Pass `startDate` and `endDate` to `useEmployeePerformance()`
- Replace `overall_score` with `computeEffectiveScore()` effective score
- The "--" will be replaced with the correct score

### After the Fix

All three views will show the same number (78.0 in Iulian's case) because they all use the same `computeEffectiveScore` function with the same month date range.

### On Score Card Position

The "My Score" card position on the Home page (bottom of the screen, next to "Upcoming Shifts") is fine -- it's visible after a short scroll and sits in a natural stats row. No layout change needed.

### Technical Detail

Both files need the same change pattern:

```typescript
// Before (wrong):
const myPerformanceScore = performanceScores?.find(s => s.employee_id === id)?.overall_score;

// After (correct):
import { computeEffectiveScore } from "@/lib/effectiveScore";

const rawScore = performanceScores?.find(s => s.employee_id === id);
const myPerformanceScore = rawScore ? computeEffectiveScore(rawScore).effective_score : null;
```

For Profile specifically, also add the missing date range:
```typescript
const dateRange = useMemo(() => ({
  start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
}), []);

const { data: performanceScores } = useEmployeePerformance(dateRange.start, dateRange.end);
```

### What This Does NOT Change

- No database changes
- Score Breakdown page is already correct -- no changes needed there
- The scoring algorithm itself stays the same
- Kiosk and management dashboard scores are unaffected
