

## Enhance Staff Profile with Real Performance Data and Badges

### What's Wrong Now
The Staff Profile page (seen when a manager clicks "View" on an employee) shows placeholder data:
- **Base Salary**: Shows raw field, no formatting
- **This Month Hours**: Hardcoded "0h" -- never computed from actual attendance
- **Performance Score**: Hardcoded "N/A" -- never fetches real score
- **Last Shift**: Hardcoded "-" -- never queries actual shifts
- **No Performance tab** with score breakdown, tier badge, or earned badges

### What Will Change

**1. Wire up real performance data in the stat cards**
- Fetch the employee's effective score using the existing `useEmployeePerformance` hook and `computeEffectiveScore` utility
- Compute actual hours worked this month from attendance logs
- Show real last shift date from attendance data
- Display the actual performance score with color coding and a tier badge next to the employee name

**2. Add a "Performance" tab**
- Show the tier badge prominently
- Display score breakdown (Attendance, Punctuality, Tasks, Tests, Reviews) with progress bars -- reusing the same pattern from the mobile Score Breakdown page
- Show earned badges using the existing `BadgesSection` component
- Show warning penalty if applicable
- Include a mini score history chart using the `ScoreHistoryChart` component

**3. No new database changes needed**
All the data and hooks already exist. This is purely a front-end wiring task.

### Technical Details

**File: `src/pages/workforce/StaffProfile.tsx`**

New imports to add:
- `useEmployeePerformance` hook
- `computeEffectiveScore`, `formatEffectiveScore` from `effectiveScore`
- `TierBadge` component
- `BadgesSection` component
- `ScoreHistoryChart` component
- `useMonthlyScores` hook
- `computeEarnedBadges` from `performanceBadges`
- `useBadgeConfigurations` hook
- `startOfMonth`, `endOfMonth` from date-fns
- `useMemo` from React
- `Progress` component

Changes:
1. Add date range computation for current month
2. Call `useEmployeePerformance(start, end)` and find the employee's record by `id`
3. Call `useMonthlyScores(id, 6)` for history
4. Call `useBadgeConfigurations()` for badge configs
5. Compute `effectiveScore` via `computeEffectiveScore()`
6. Compute `earnedBadges` via `computeEarnedBadges()`
7. Compute hours from `memberAttendance` (sum check-in to check-out durations)
8. Find last shift from attendance logs
9. Update the 4 stat cards to show real values
10. Add a `TierBadge` next to the employee name
11. Add a "Performance" `TabsTrigger` and `TabsContent` with score components, badges section, and score history chart

