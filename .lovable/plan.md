

# Kiosk Department Filtering — Investigation Results

## Finding: Filtering is Working Correctly

The department filter is functioning as designed. The Front of House kiosk correctly filters to FOH roles (Bartender, Dishwasher, Host, Shift Manager). At LBFC Amzei there are 6 active Shift Managers in FOH.

**Why only 2 appear in MTD Score:** The leaderboard hides employees with zero activity. Only Serdar Nasurla (4 shifts this month) and Iulian Constantin (1 shift) have any scheduled shifts in February. The other 4 FOH employees have zero shifts, zero tasks, zero tests — so they're excluded by the "filter inactive" logic.

**Why Today's Team shows 0:** No FOH employee has a shift scheduled for today (Feb 27).

## This is a Data Problem, Not a Code Bug

The scheduling data is sparse — most FOH staff have no shifts. The kiosk is correctly reflecting reality.

## Optional UX Improvement

To avoid confusion, we could show ALL department employees in the MTD Score section (including those with no activity, ranked at the bottom with a "No activity" label) instead of hiding them. This way managers can see the full roster and realize scheduling gaps.

### Change: `KioskDashboard.tsx` — MTD Score section
- Change `computeEffectiveScores(weeklyAllScores, true)` to `computeEffectiveScores(weeklyAllScores, false)` (don't filter inactive)
- Still apply department role filter
- Employees with no activity show score as "—" and appear at the bottom

This is a small change (1 line + minor display tweak) that makes the kiosk more transparent about team composition.

