
## Fix: Sync Schedule Publishing Systems

### The Problem

There are two independent "publish" mechanisms that don't communicate:

1. **Schedule Period** (governance banner) -- sets `schedule_periods.state = 'published'` for a location/week. This is what shows "Schedule Status: Published" at the top.
2. **Individual Shifts** -- each shift has its own `is_published` boolean. The green "Publish Week" and per-day "Publish (N)" buttons toggle this flag.

When you click "Publish" on the governance banner, it only updates the `schedule_periods` table. The individual shifts keep `is_published = false`, so they still show "Draft" badges. The per-day/week publish buttons remain green as if nothing happened. This is confusing and contradictory.

### The Fix

When the schedule period is published (via the governance banner), **automatically bulk-publish all shifts** for that location and week. This ensures a single, consistent meaning of "published."

Conversely, when using the per-day/week publish buttons (non-governance flow), the behavior stays the same since those are for companies without governance enabled.

### Changes

| File | What Changes |
|------|-------------|
| `src/hooks/useScheduleGovernance.ts` | In `usePublishSchedulePeriod` and `usePublishAndLockSchedulePeriod`, after updating the period state, also bulk-update all shifts for that location + week to `is_published = true`. |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | When governance is enabled and the period is already published/locked, hide the per-day "Publish (N)" buttons and the "Publish Week" button (they are redundant -- the banner already controls this). |
| `src/components/workforce/SchedulePeriodBanner.tsx` | No structural changes, but the publish action will now also set `is_published` on all shifts as part of the mutation. |

### Technical Details

**usePublishSchedulePeriod mutation update:**

After setting `schedule_periods.state = 'published'`, add a second query:
```
await supabase
  .from('shifts')
  .update({ is_published: true })
  .eq('company_id', period.company_id)
  .eq('location_id', period.location_id)
  .gte('shift_date', period.week_start_date)
  .lt('shift_date', endOfWeekDate)
```

The same logic applies to `usePublishAndLockSchedulePeriod`.

To do this, the mutations need access to the period's `location_id`, `company_id`, and `week_start_date`. These will be passed as additional parameters alongside `periodId`.

**EnhancedShiftWeekView conditional hiding:**

When governance is enabled and the current location's period state is `'published'` or `'locked'`, suppress the per-day publish buttons and the "Publish Week" button in the toolbar. The governance banner already serves as the single publish control in that mode.

### Result

- Publishing via the governance banner will mark all shifts as published (no more "Draft" badges after publishing)
- The UI won't show contradictory states (banner says "Published" while shifts say "Draft")
- For companies without governance enabled, the existing per-shift publish buttons continue to work as before
