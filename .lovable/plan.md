

## Gamification and Employee Engagement System

### What's Missing Today

The current scoring system is purely informational -- employees see a number but have no reason to care about it. There's no history, no progression, no reward, and no fun.

### Proposed Feature Set

This is a phased approach -- Phase 1 is a meaningful, buildable first step. Phases 2-3 are future extensions.

---

### Phase 1: Score History, Tiers, and Monthly Badges (Recommended to build now)

#### 1A. Monthly Score Snapshots (Database)

Create a `performance_monthly_scores` table that stores each employee's effective score at month end. This gives employees a history timeline and enables month-over-month comparison.

```text
performance_monthly_scores
  - id (uuid)
  - employee_id (uuid, FK)
  - company_id (uuid, FK)
  - month (date, first day of month)
  - effective_score (numeric)
  - used_components (int)
  - attendance_score, punctuality_score, task_score, test_score, review_score (nullable)
  - rank_in_location (int, nullable)
  - created_at (timestamptz)
  - UNIQUE(employee_id, month)
```

A backend function (edge function on a cron or triggered at month-end) snapshots current scores into this table.

#### 1B. Performance Tiers

Map score ranges to named tiers that employees can identify with:

```text
90-100  -->  Star Performer   (gold)
80-89   -->  High Achiever    (blue)
60-79   -->  Steady Progress  (green)
40-59   -->  Developing       (amber)
0-39    -->  Needs Support    (red)
No data -->  New / Unranked   (gray)
```

Display the tier badge on:
- Home page "My Score" card
- Profile page
- Score Breakdown page header
- Leaderboard entries

#### 1C. Monthly Badges (Earned Automatically)

Award badges based on monthly performance data. These are purely frontend-calculated from existing data -- no new tracking needed:

- **Perfect Attendance** -- 100% attendance score
- **Always On Time** -- 100% punctuality score  
- **Task Champion** -- 100% task completion score
- **Top 3 Finish** -- Ranked in top 3 at their location
- **Rising Star** -- Score improved 10+ points from last month (requires score history)
- **Consistency Streak** -- Score stayed above 80 for 3+ consecutive months

Show earned badges on the Score Breakdown page in a "My Badges" section, and a badge count on the Profile page.

#### 1D. Score History Chart on Breakdown Page

Add a small line chart (using Recharts, already installed) at the top of the Score Breakdown page showing the last 6 months of scores. This gives employees a visual sense of progress.

---

### Phase 2: Social and Recognition (Future)

- **Peer Shoutouts** -- employees can send a quick recognition to a colleague ("Great job closing today!")
- **Manager Awards** -- managers can grant special one-off badges ("Employee of the Month")
- **Monthly Recap Notification** -- "You ranked #2 this month! You earned the Perfect Attendance badge"

### Phase 3: Tangible Rewards (Future)

- **Points System** -- tie score to redeemable points (extra break, shift preference, etc.)
- **Team Challenges** -- location-wide goals ("Everyone above 80 this month = pizza party")

---

### What to Build Now (Phase 1 Scope)

1. **Database**: Create `performance_monthly_scores` table with RLS policies
2. **Edge Function**: Monthly snapshot cron that computes and stores scores
3. **Tier System**: Pure frontend utility mapping scores to tier names/colors/icons
4. **Badge System**: Frontend utility that checks score data against badge criteria
5. **UI Updates**:
   - Score Breakdown page: Add score history chart + badges section + tier badge
   - Home page "My Score" card: Show tier name alongside score
   - Profile page: Show tier + badge count
   - Leaderboard: Show tier badge next to each employee

### Technical Notes

- Tiers and badges are computed client-side from existing + archived score data -- lightweight, no complex backend logic
- The monthly snapshot edge function runs once per month and writes one row per employee
- Recharts is already installed for the history chart
- No changes to the core scoring algorithm -- this is purely a presentation/engagement layer on top of existing data
- RLS policies on the scores table: employees can read their own + same-location scores; managers can read all in their company
