

## Unified Score Transparency -- Complete Implementation Plan

### What We're Building

A new **Score Breakdown page** (`/staff/score`) that makes the existing Performance Score (0-100) fully transparent to employees. One score, one truth -- visible across mobile and kiosk. No second scoring system.

### Current State

- Employees see a single number ("78.5") on StaffHome and StaffProfile with zero explanation
- The full breakdown (Attendance, Punctuality, Tasks, Tests, Reviews, Warnings) only exists for managers
- No `/staff/score` route or `StaffScoreBreakdown` page exists
- The `effectiveScore.ts` utility already handles "which components have data" logic
- The `useEmployeePerformance` hook already fetches everything we need

### Step 1: Create Score Breakdown Page

**New file: `src/pages/staff/StaffScoreBreakdown.tsx`**

Mobile-first page showing:
- Overall score with large circular progress indicator and color coding (green >= 80, amber >= 60, red < 60)
- 5 component cards, each with:
  - Icon + name (Attendance, Punctuality, Tasks, Tests, Reviews)
  - Score value (0-100) or "--" when no data exists
  - Color-coded progress bar
  - Raw metric summary (e.g., "18/20 shifts", "3 late arrivals", "12/15 tasks on time")
  - "No data yet" state clearly marked
- Warning penalty section (if warnings exist): shows penalty amount, warning count, decay info
- "How to improve" tip for the weakest component (e.g., "Focus on arriving on time to boost Punctuality")
- Back navigation button
- Uses existing `useEmployeePerformance` hook + `computeEffectiveScore` from `effectiveScore.ts`
- Follows existing mobile patterns: `StaffBottomNav`, gradient header, Card components

### Step 2: Register Route

**Modified file: `src/App.tsx`**
- Add `/staff/score` route pointing to `StaffScoreBreakdown` within ProtectedRoute

### Step 3: Make Score Tappable on Staff Profile

**Modified file: `src/pages/staff/StaffProfile.tsx`**

The Score Card (lines 183-193) becomes tappable:
- Wrap in a clickable container that navigates to `/staff/score`
- Add `ChevronRight` icon on the right side
- Add subtle "View Breakdown" text under the score
- Add a mini progress bar showing the score visually

### Step 4: Make Score Tappable on Staff Home

**Modified file: `src/pages/staff/StaffHome.tsx`**

The Trophy stat card (lines 420-424) becomes tappable:
- Add `onClick={() => navigate("/staff/score")}` (it already has `cursor-pointer`)
- Add subtle "Tap for details" text below the score number
- Show weakest component hint when data exists (e.g., "Improve: Punctuality")

### Step 5: Manual Verification Checklist

After implementation, verify across all views:

| View | Check | Pass Criteria |
|------|-------|---------------|
| Staff Home (mobile) | Trophy card tap | Navigates to `/staff/score` |
| Staff Home (mobile) | Score value | Matches breakdown page total |
| Staff Profile (mobile) | Score card tap | Navigates to `/staff/score` |
| Score Breakdown (mobile) | 5 components shown | Each with bar + value or "--" |
| Score Breakdown (mobile) | Warning section | Shows penalty when warnings exist |
| Score Breakdown (mobile) | Back navigation | Returns to previous page |
| Score Breakdown (desktop) | Layout | Responsive, no broken layout |
| Kiosk leaderboard | No regression | Still shows scores correctly |
| Manager performance page | No regression | Unchanged |

### What This Does NOT Change

- No database migrations needed
- No new tables or columns
- No changes to score calculation logic
- No changes to manager views
- No changes to Kiosk Champions or leaderboard
- Existing `effectiveScore.ts` and `useEmployeePerformance` used as-is

### Technical Details

**New file:** `src/pages/staff/StaffScoreBreakdown.tsx`
- Imports: `useEmployeePerformance`, `computeEffectiveScore`, `Card`, `Progress`, `Badge`, `StaffBottomNav`
- Fetches current month date range (same pattern as StaffHome lines 60-66)
- Finds current employee's score from the array (same pattern as StaffHome lines 70-72)
- Renders 5 component rows with `Progress` bars and color-coded scores
- Warning penalty section with `AlertTriangle` icon
- Improvement tip derived from lowest-scoring used component

**Modified files:**
- `src/App.tsx` -- 1 line: add route
- `src/pages/staff/StaffProfile.tsx` -- Score Card section (lines 183-193): add click handler, chevron, "View Breakdown" text
- `src/pages/staff/StaffHome.tsx` -- Trophy card (lines 420-424): add navigate handler, hint text

**Risk:** Zero. All data comes from existing hooks. No calculation changes. Pure UI addition.

