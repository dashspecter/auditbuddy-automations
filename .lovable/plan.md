

## Fix: Published Schedule Shows Draft Tags on All Shifts

### Problem

The schedule banner correctly shows "Published" (the `schedule_periods` record was updated), but every individual shift still displays a "Draft" badge. This is because the bulk update that should set `is_published = true` on all shifts is **silently failing** -- its error result is never checked.

### Root Cause

In `useScheduleGovernance.ts`, both `usePublishSchedulePeriod` and `usePublishAndLockSchedulePeriod` mutations:

1. Update the `schedule_periods` record state to 'published' (works fine, error is checked)
2. Then bulk-update shifts to set `is_published: true` -- but **the error from this update is completely ignored**

```typescript
// Current code -- error is never checked!
await supabase
  .from('shifts')
  .update({ is_published: true })
  .eq('company_id', period.company_id)
  .eq('location_id', period.location_id)
  .gte('shift_date', period.week_start_date)
  .lt('shift_date', weekEndStr)
  .not('status', 'in', '("cancelled","deleted")');
```

Additionally, the `status` column on shifts is never updated from `'draft'` to `'published'`, leaving a data inconsistency.

### Database Evidence

```text
schedule_periods: state = 'published', published_at = Feb 23
shifts (Bab's Obor, Feb 23-Mar 1): ALL 15 shifts have is_published = false, status = 'draft'
```

### Fix

Update both publish mutations in `useScheduleGovernance.ts` to:

1. **Check the error** from the shifts bulk update and throw if it fails
2. **Update both columns**: set `is_published: true` AND `status: 'published'`

### Changes

| File | What Changes |
|------|-------------|
| `src/hooks/useScheduleGovernance.ts` | Fix both `usePublishSchedulePeriod` and `usePublishAndLockSchedulePeriod` to check errors from the shifts bulk update and also set `status: 'published'` |

### Technical Details

**In `usePublishSchedulePeriod` (around line 169) and `usePublishAndLockSchedulePeriod` (around line 292):**

Replace:
```typescript
await supabase
  .from('shifts')
  .update({ is_published: true })
  ...
```

With:
```typescript
const { error: shiftsError } = await supabase
  .from('shifts')
  .update({ is_published: true, status: 'published' })
  .eq('company_id', period.company_id)
  .eq('location_id', period.location_id)
  .gte('shift_date', period.week_start_date)
  .lt('shift_date', weekEndStr)
  .not('status', 'in', '("cancelled","deleted")');

if (shiftsError) {
  console.error('Failed to bulk-publish shifts:', shiftsError);
  throw new Error('Schedule period updated but failed to publish individual shifts');
}
```

### Immediate Data Fix

After deploying the code fix, we should also run a one-time data migration to fix the 15 Bab's Obor shifts (and any others) that are currently stuck as unpublished despite their schedule period being published. This will update all shifts in published schedule periods to have `is_published = true`.

### Result

- Publishing a schedule will correctly mark all shifts as published (both `is_published` and `status` columns)
- If the bulk shift update fails, the error will surface to the user instead of silently succeeding
- Existing stuck shifts will be corrected by the data migration
