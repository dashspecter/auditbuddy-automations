
## Add Gamification Visibility to Admin Dashboard

### Problem
The tier and badge system was only built for employee mobile views. Admins/owners have zero visibility into how the scoring system categorizes employees or which badges they've earned. This creates a disconnect -- the admin can't understand what their employees are experiencing.

### Changes

#### 1. Enhance `src/pages/workforce/EmployeePerformance.tsx`

**Add Tier Distribution Summary Card** at the top of the page:
- Show a row of cards, one per tier (Star Performer, High Achiever, Steady Progress, Developing, Needs Support, Unranked)
- Each card shows: tier icon, tier name, count of employees in that tier, percentage of total
- Uses existing `getTier()` from `performanceTiers.ts` applied to the already-loaded `effectiveScores`

**Add Tier Badge to each employee row:**
- Import `TierBadge` component (already exists for staff views)
- Display it next to the employee name in `renderEmployeeCard`

**Add Badges column to expanded employee detail:**
- Import `computeEarnedBadges` from `performanceBadges.ts`
- Fetch monthly history using `useMonthlyScores` for the expanded employee
- Show earned badge icons with names in the collapsible detail section

**Add "How Scoring Works" info panel:**
- A collapsible card at the top with an Info icon
- Explains: effective score = average of active components only, tier mapping, badge criteria
- Helps admins understand what employees see

#### 2. New Component: `src/components/workforce/TierDistributionCard.tsx`

A summary card that takes `EffectiveEmployeeScore[]` and renders:
- A horizontal bar or row of tier buckets with counts
- Visual breakdown of team health at a glance

#### 3. New Component: `src/components/workforce/ScoringExplainerCard.tsx`

A collapsible info card explaining:
- What "effective score" means (only active components averaged)
- The five tiers and their score ranges
- The six badges and how they're earned
- How warnings affect scores (penalty with 90-day decay)

### Technical Details

- No database changes needed -- all data already exists
- Tier calculation reuses `getTier()` from `src/lib/performanceTiers.ts`
- Badge calculation reuses `computeEarnedBadges()` from `src/lib/performanceBadges.ts`
- Monthly scores fetched via existing `useMonthlyScores` hook
- `TierBadge` component already exists at `src/components/staff/TierBadge.tsx` -- reused as-is
- All computations are client-side from already-fetched data

### Files to Create
- `src/components/workforce/TierDistributionCard.tsx` -- tier summary visualization
- `src/components/workforce/ScoringExplainerCard.tsx` -- how-it-works info panel

### Files to Edit
- `src/pages/workforce/EmployeePerformance.tsx` -- integrate tier badges, badge display, distribution card, and explainer
