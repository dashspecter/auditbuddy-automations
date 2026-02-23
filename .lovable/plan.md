

## Custom Badges and Adjustable Thresholds

### What Changes

Currently, all 6 badges and their thresholds are hardcoded in `src/lib/performanceBadges.ts`. This plan moves badge configuration to the database so admins can:

1. **Adjust thresholds** for built-in badges (e.g., change "Rising Star" from +10 to +5 points)
2. **Enable/disable** individual badges
3. **Create custom badges** with a name, description, icon (picked from a list), color, and a rule type with configurable threshold

---

### Database

Create a `badge_configurations` table:

```text
badge_configurations
  - id (uuid, PK)
  - company_id (uuid, FK to companies)
  - badge_key (text) -- unique per company, e.g. "perfect_attendance" or "custom_teamwork"
  - name (text)
  - description (text)
  - icon (text) -- icon name from a predefined set (e.g. "CheckCircle2", "Clock", "Star")
  - color (text) -- tailwind class e.g. "text-green-600 dark:text-green-400"
  - rule_type (text) -- one of: "attendance_min", "punctuality_min", "task_min", "rank_max", "score_improvement", "streak_min", "effective_score_min", "manual"
  - threshold (numeric) -- the configurable value (e.g. 100 for perfect attendance, 3 for top-3)
  - streak_months (int, nullable) -- for streak-type rules
  - is_active (boolean, default true)
  - is_system (boolean, default true) -- true for the 6 built-in badges, false for custom
  - sort_order (int)
  - created_at (timestamptz)

  UNIQUE(company_id, badge_key)
```

On first use (or via a seed migration), insert the 6 default badges for each company with `is_system = true`. Admins can edit thresholds but cannot delete system badges -- only disable them.

RLS: company members can read; only company owners/admins can insert/update.

### Admin UI: Badge Management Page

Add a new section accessible from the Performance page (or a sub-tab) where admins can:

- **See all badges** in a list -- system badges marked with a lock icon
- **Toggle active/inactive** for any badge
- **Edit threshold** for each badge via inline number input
- **Add custom badge** via a dialog:
  - Name, description
  - Pick icon from a grid of ~15-20 curated Lucide icons
  - Pick color from preset palette
  - Select rule type from dropdown
  - Set threshold value
- **Delete** custom badges (system badges can only be disabled)

### Badge Computation Update

Update `computeEarnedBadges` to accept badge configs from the database instead of using hardcoded `BADGE_DEFINITIONS`. The function will:

1. Accept `BadgeConfig[]` (from database) instead of using the static array
2. Loop through active configs and evaluate each based on `rule_type` + `threshold`
3. Map the `icon` string to the actual Lucide component via a lookup table
4. Return the same `PerformanceBadge[]` output so all existing UI components keep working

The `ScoringExplainerCard` and `BadgesSection` components will dynamically render whatever badges are configured -- no changes needed to those components beyond passing the right data.

### Rule Types Explained

| rule_type | threshold meaning | Example |
|-----------|------------------|---------|
| `attendance_min` | Minimum attendance score | 100 = perfect attendance |
| `punctuality_min` | Minimum punctuality score | 100 = always on time |
| `task_min` | Minimum task score | 100 = task champion |
| `rank_max` | Maximum rank at location | 3 = top 3 finish |
| `score_improvement` | Min point increase vs last month | 10 = rising star |
| `streak_min` | Min score for consecutive months (uses `streak_months`) | 80 for 3 months |
| `effective_score_min` | Min effective score this month | 90 = high performer |
| `manual` | Awarded manually by manager (future Phase 2) | N/A |

### Files to Create

- `src/components/workforce/BadgeManagement.tsx` -- admin badge list + edit UI
- `src/components/workforce/AddCustomBadgeDialog.tsx` -- dialog for creating custom badges
- `src/hooks/useBadgeConfigurations.ts` -- hook to fetch/update badge configs from database

### Files to Edit

- `src/lib/performanceBadges.ts` -- refactor `computeEarnedBadges` to accept database configs; add icon lookup map; keep `BADGE_DEFINITIONS` as fallback defaults
- `src/pages/workforce/EmployeePerformance.tsx` -- add badge management tab/section; pass configs to badge computation
- `src/pages/staff/StaffScoreBreakdown.tsx` -- fetch company badge configs and pass to `computeEarnedBadges`
- `src/components/workforce/ScoringExplainerCard.tsx` -- load badge configs from database instead of static `BADGE_DEFINITIONS`

### Seed Logic

When a company first accesses badge settings, if no rows exist for their `company_id`, auto-insert the 6 system defaults. This avoids needing a global migration for every company.

