

## Platform-Wide Performance Data Consistency Audit and Fix

### Audit Findings

I audited every view that displays performance metrics across the platform. Here is the status of each:

### Component-by-Component Matrix

| View | Attendance | Punctuality | Tasks | Tests | Reviews | Warning Penalty | Effective Score | Badges |
|------|-----------|-------------|-------|-------|---------|----------------|----------------|--------|
| **Mobile Score Breakdown** (`StaffScoreBreakdown.tsx`) | OK: "X/Y shifts worked" | OK: "N late (M min)" | OK: "X/Y on time" | OK: "X/Y passed (avg Z%)" | OK: "N reviews (avg Z%)" | OK: shown with decay note | OK: uses `computeEffectiveScore` | OK: `BadgesSection` |
| **Mobile Profile** (`staff/StaffProfile.tsx`) | OK | OK | OK | OK | OK | OK (via score) | OK: uses `computeEffectiveScore` | OK: badge count shown |
| **Manager Performance Table** (`EmployeePerformance.tsx`) | OK: "X/Y shifts worked" | OK: "N late (M min total)" | OK: "X/Y completed on time" | OK: "X/Y passed (avg Z%)" | OK: "N reviews (avg Z%)" | OK: warning section | OK: uses `computeEffectiveScores` | OK: `EmployeeBadgesRow` |
| **Manager Staff Profile** (`workforce/StaffProfile.tsx`) | OK: "X/Y shifts" | WRONG: "N late" (missing minutes) | WRONG: "X/Y done" (should be "on time") | OK: "N taken" | OK: "N reviews" | OK: shown | OK: uses `computeEffectiveScore` | OK: `BadgesSection` |
| **Employee Detail Dialog** (`EmployeePerformanceDetail.tsx`) | OK: "X/Y shifts" | WRONG: "N late arrivals" (missing minutes) | OK: "X/Y on time" | OK: "X/Y passed" | OK: "N reviews" | OK: shown | PARTIAL: has own `getEffectiveScore()` instead of `computeEffectiveScore` | NO badges |
| **Dashboard Workforce Analytics** (`WorkforceAnalytics.tsx`) | OK (aggregate) | OK (aggregate) | OK (aggregate) | OK (aggregate) | N/A | OK (aggregate) | WRONG: uses `overall_score` (not effective score) | N/A |
| **Kiosk/Location Leaderboard** (`StaffLocationLeaderboard.tsx`) | N/A (summary) | N/A | N/A | N/A | N/A | N/A | OK: uses `kioskEffectiveScore` | N/A |

### Issues Found (4 total)

**Issue 1: Manager Staff Profile -- Punctuality detail missing late minutes**
- File: `src/pages/workforce/StaffProfile.tsx` line 260
- Shows: `"1 late"` 
- Should show: `"1 late (260 min)"` or `"No late arrivals"`

**Issue 2: Manager Staff Profile -- Tasks detail says "done" not "on time"**
- File: `src/pages/workforce/StaffProfile.tsx` line 261
- Shows: `"73/73 done"`
- Should show: `"0/73 on time"`

**Issue 3: Employee Performance Detail Dialog -- Punctuality detail missing late minutes**
- File: `src/components/EmployeePerformanceDetail.tsx` line 205
- Shows: `"0 late arrivals"`
- Should show: `"1 late (260 min)"` or `"No late arrivals"` (with minutes when applicable)

**Issue 4: Employee Performance Detail Dialog -- Uses custom effective score logic instead of shared utility**
- File: `src/components/EmployeePerformanceDetail.tsx` lines 80-108
- Has its own `getEffectiveScore()` function that duplicates `computeEffectiveScore` logic
- Risk: if scoring formula changes, this view would fall out of sync

**Issue 5: Dashboard Workforce Analytics -- Uses `overall_score` instead of `effective_score`**
- File: `src/components/dashboard/WorkforceAnalytics.tsx` lines 91, 117, 118, 366, 367, 394
- Uses the raw `overall_score` field from the performance hook instead of computing effective scores
- This means it does NOT exclude unused components from the average and does NOT apply warning penalty correctly

### Plan

**File 1: `src/pages/workforce/StaffProfile.tsx`** (2 lines)
- Line 260: Change punctuality detail to show late minutes when count > 0
- Line 261: Change tasks detail to use `tasks_completed_on_time` and say "on time"

**File 2: `src/components/EmployeePerformanceDetail.tsx`** (2 changes)
- Line 205: Change punctuality detail to include late minutes
- Lines 80-110: Replace custom `getEffectiveScore()` with `computeEffectiveScore` from shared utility, ensuring the dialog always matches other views

**File 3: `src/components/dashboard/WorkforceAnalytics.tsx`** (1 change)
- Import `computeEffectiveScores` and apply it to `allScores`
- Replace all `overall_score` references with `effective_score` from the computed results
- This ensures the dashboard summary cards and leaderboard match the performance table

### What Will NOT Change (already correct)
- Mobile Score Breakdown page -- gold standard, already correct
- Mobile Profile page -- correct
- Manager Performance Table with expanded details -- correct
- Kiosk/Location Leaderboard -- uses its own kiosk-specific effective score (correct by design)
- Badge computation logic -- all views use `computeEarnedBadges` consistently
- Score history chart -- all views use `useMonthlyScores` consistently

