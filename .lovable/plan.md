
Problem confirmed: the schedule page is working, but Dash is still creating the shift on the wrong date.

What I verified
- The schedule grid is querying the correct week (`2026-03-23` → `2026-03-29`) and loading data normally.
- `workforce` is active for this company, realtime is subscribed, and the location is correct.
- The latest Dash-created shift is:
  - `3de979a0-b6d7-4f19-8697-de716c704440`
  - `shift_date = 2024-07-30`
  - `is_published = true`
  - `status = published`
  - assigned to `Grecea Alexandru`
- Because it lives on `2024-07-30`, it will never appear in the current week schedule.
- There is also an older broken draft shift:
  - `977bbc0e-5791-44aa-b48c-a6730a1fff95`
  - `shift_date = 2024-07-30`
  - `is_published = false`
  - `status = draft`

Why this is still happening
1. Dash still trusts the model’s `shift_date` blindly in `create_shift_draft`.
2. The poisoned July 2024 context is still being reused through active sessions.
3. `dash_sessions.messages_json` still stores only plain text, not structured approval state.
4. `dash_pending_actions.session_id` is not being set, so stale drafts cannot be cleaned up per session.
5. Multiple old sessions remain `active`, so bad context keeps coming back.

Implementation plan
1. Fix date resolution at the backend
- Update `supabase/functions/dash-command/index.ts` so shift dates are resolved server-side from the latest user request, not just trusted from the model.
- Add hard handling for phrases like `today`, `tomorrow`, weekdays, and “this week” using `Europe/Bucharest`.
- If the model sends a conflicting date, override it or block with clarification instead of creating the shift.
- Add a guard that rejects suspicious stale dates for “today/tomorrow” requests.

2. Pass real session context through the whole Dash flow
- Extend the Dash tool execution path so `session_id` and latest user text are available inside `create_shift_draft`.
- Save `session_id` into `dash_pending_actions` for all approval-gated actions, especially shifts.

3. Persist structured Dash state properly
- Save assistant structured events into `dash_sessions.messages_json` together with `content`.
- Restore those structured events in:
  - `src/hooks/useDashChat.ts`
  - `src/components/dash/DashSessionHistory.tsx`
- This keeps approval cards, `pending_action_id`, and clarification context alive after reload/history reopen.

4. Stop stale session contamination
- Change `clearChat` / new conversation flow so the current session is archived instead of left active.
- Expire or archive stale pending actions tied to that session.
- Ensure auto-load only restores the latest valid active session, not old poisoned ones.

5. Prevent fake “draft created” responses
- In `dash-command`, if the model says it drafted/created a shift but never actually called `create_shift_draft`, return a clarification/error response instead of misleading text.
- This removes the “looks successful but nothing valid exists” path.

6. Repair current broken data
- Clean up the bad records already created:
  - archive/remove the stale draft `977bbc0e-5791-44aa-b48c-a6730a1fff95`
  - repair or recreate the published/assigned wrong-date shift `3de979a0-b6d7-4f19-8697-de716c704440` onto the correct current date
- Expire the two stale pending actions that are still `pending`
- Archive the three currently active poisoned Dash sessions so new tests start clean

7. End-to-end verification
- Create shift with “today”
- Create shift with “tomorrow”
- Create shift after clarification (“Alex Grecea” → “Grecea Alexandru”)
- Approve directly from the approval card
- Reload Dash and confirm approval card still works
- Reopen from History and confirm state is preserved
- Confirm the shift appears in `/workforce/shifts` in the right week/location
- Confirm employee assignment is present
- Confirm no leftover ghost drafts/pending actions remain

Files involved
- `supabase/functions/dash-command/index.ts`
- `src/hooks/useDashChat.ts`
- `src/components/dash/DashSessionHistory.tsx`
- likely `src/components/dash/DashMessageList.tsx` / `ActionPreviewCard.tsx` for restored structured state

Technical note
This is not a schedule-grid rendering bug, not an RLS bug, and not a realtime bug. The primary failure is upstream: Dash is still creating valid records on the wrong date, then the schedule correctly does not show them because they are outside the visible week.
