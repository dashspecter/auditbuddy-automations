
# Dash Shift Creation — Full Fix (Completed)

## What was fixed

### 1. Server-side date resolution (dash-command edge function)
- `create_shift_draft` now resolves "today"/"tomorrow" server-side using Europe/Bucharest timezone
- Dates >1 year in the past are automatically overridden to today with a console warning
- Location resolution now scoped to `company_id` and handles multiple matches with clarification

### 2. Structured event persistence
- Session messages now save structured events (action_preview, clarification, execution_result) alongside text
- `useDashChat.ts` and `DashSessionHistory.tsx` restore structured events on session reload/history select
- Approval cards survive page refresh and history navigation

### 3. Session lifecycle cleanup
- `clearChat` now archives the current session and expires pending actions instead of leaving them active
- Prevents stale context contamination across new conversations

### 4. Data repair
- Fixed shift `3de979a0` from 2024-07-30 → 2026-03-23 (now visible in schedule)
- Deleted stale draft shift `977bbc0e`
- Expired 2 stale pending actions
- Archived 3 poisoned sessions

## Files changed
| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Server-side date resolution, structured event persistence in sessions |
| `src/hooks/useDashChat.ts` | Restore structured events on load, archive session on clear |
| `src/components/dash/DashSessionHistory.tsx` | Restore structured events on history select |
