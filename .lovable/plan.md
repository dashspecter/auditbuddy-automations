
Deep dive result: the schedule itself is not the primary bug. I verified the full chain and found the failure is upstream in Dash orchestration.

What I verified
- The missing shift `977bbc0e-5791-44aa-b48c-a6730a1fff95` exists in the database as:
  - `shift_date = 2024-07-30`
  - `is_published = false`
  - `status = draft`
  - no `shift_assignments`
- The schedule grid only shows shifts for the current visible week and filters location rows to published shifts, so this record can never appear in the current schedule.
- Realtime is enabled for both `shifts` and `shift_assignments`, so this is not mainly a refresh problem.
- The active Dash session still contains old hallucinated “July 30, 2024” assistant messages, so retries are being contaminated by stale history.
- Recent Dash logs show multiple “I’ve drafted a shift…” responses with `tools_used = []`, meaning Dash sometimes only writes text and does not actually create a real draft/pending action.

Root causes
1. Non-deterministic draft creation  
   Dash sometimes replies with a fake draft message without calling `create_shift_draft`.

2. Broken approval flow  
   The Approve button sends natural-language text instead of executing directly.  
   `useDashChat` only sends `role/content`, so `pending_action_id` is lost between turns.

3. Session/history loses structured state  
   `dash_sessions.messages_json` stores only plain text, not structured approval metadata/cards. After reload/history select, approval context is gone.

4. Stale poisoned session  
   Even with newer prompt fixes, the current session keeps feeding “July 30, 2024” back into the model.

5. Employee resolution is not robust enough  
   “Alex Grecea” does not exist. “Grecea Alexandru” does exist. Current resolution is not safe for missing/ambiguous names.

6. Execution is not atomic enough  
   Shift creation and assignment are separate operations, so partial success is possible.

Implementation plan
1. Make approvals deterministic
- Change the Dash approval UX so Approve executes by `pending_action_id` directly instead of sending free-text confirmation.
- Add a backend approval path in `dash-command` that bypasses the model for approved pending actions.

2. Persist structured Dash state
- Save/load structured events in `dash_sessions.messages_json` alongside message text.
- Preserve `pending_action_id`, action type, draft payload, and approval capability on reload and session history restore.

3. Prevent fake drafts
- Harden `dash-command` so it cannot say “I’ve drafted…” unless `create_shift_draft` actually ran.
- If a write intent is detected and the model returns draft/create language without the required tool, force a retry or return clarification instead.

4. Fix date handling properly
- Use timezone-safe “today” resolution for Europe/Bucharest instead of UTC slicing.
- Stop relative dates from drifting around midnight or inheriting stale context.

5. Strengthen employee/location resolution
- Resolve location inside the current company only.
- Resolve employee with a safer strategy:
  - exact match first
  - normalized token-order match second
  - if no match: block and ask
  - if multiple matches: clarification card with candidates
- Do not silently pick the first fuzzy match.

6. Make shift execution atomic
- Move “create published shift + optional approved assignment” into one transactional backend/database operation.
- Return one canonical success payload with shift id, date, location, publish state, and assignment result.

7. Repair the Dash UX
- Keep ActionPreviewCard in loading state until a real execution result arrives.
- Do not auto-flip to “Approved & Executed” after 2 seconds.
- Show exact normalized date/location/employee in both preview and success states.
- Add a direct “View in schedule” jump to the correct week/location.

8. Recover broken existing data safely
- Add a guarded recovery path for recent broken Dash-created shifts:
  - repair date/status/publish only when intent is unambiguous
  - create assignment only when employee is unambiguous
  - otherwise mark invalid/failed instead of leaving ghost records
- Archive/clear the current poisoned Dash session so new attempts start clean.

Files likely involved
- `supabase/functions/dash-command/index.ts`
- `src/hooks/useDashChat.ts`
- `src/components/dash/ActionPreviewCard.tsx`
- `src/components/dash/DashSessionHistory.tsx`
- likely one new migration/RPC for atomic shift creation

End-to-end acceptance checks
- Create shift from plain text
- Create shift from Approve button
- Reload `/dash`, then approve
- Reopen from History, then approve
- Missing employee
- Ambiguous employee
- Cross-location employee
- Current week and future week
- Manager schedule updates in real time
- Employee sees assigned shift in staff schedule
- No duplicate/stale pending actions after retries

Expected outcome
After this pass, Dash will either:
- create a real persistent draft with a valid approval card, or
- block with a clear clarification state.

Once approved, the shift will be published immediately, assigned when appropriate, and visible in both manager and employee scheduling views end-to-end.