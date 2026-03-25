
Deep-dive findings

- The click itself is correct. The browser sent:
  `direct_approval.pending_action_id = "66b7b204-1431-4bf0-b746-970ed31f2224"`
- The backend draft is also correct. The pending action exists in the database, is still `pending`, and its `preview_json` contains shift details.
- The failure happens inside the direct-approval backend path in `supabase/functions/dash-command/index.ts`:
  1. it starts with `{ pending_action_id: direct_approval.pending_action_id }`
  2. then it calls `hydrateArgsFromDraft(...)`
  3. for `delete_shift`, `update_shift`, `swap_shifts`, and several later write actions, that helper returns:
     `{ pending_action_id: previewJson.pending_action_id }`
  4. but `preview_json` does not store `pending_action_id`
  5. so the valid ID gets overwritten with `undefined`
  6. `executeShiftDeletion()` then fails with `Missing pending_action_id.`
- This is why the same request can show a valid approval card and still fail on click.
- The bug is broader than delete-shift. The same overwrite pattern likely breaks direct approval for:
  - update shift
  - swap shifts
  - create/update corrective actions
  - employee update/deactivate
  - attendance corrections
  - work orders
  - tasks
  - training status/actions
- There is also a second UI bug:
  - `ActionPreviewCard` sets local state to `approving`
  - but never gets a real success/failure result back
  - so the card can stay stuck on `Executing...` even after the backend responds
- There is also a deeper architecture gap:
  - the product copy says users can approve in a new chat message
  - but `useDashChat.sendMessage()` only sends plain text history, not structured action metadata
  - so typed approvals like “yes/approve” are not server-deterministic today

Why this likely escaped

- `create_shift` can succeed because its hydrate path uses real draft fields, not `preview_json.pending_action_id`
- delete/update/swap and the later governed write actions use a different hydrate pattern
- I found no automated tests covering the direct approval path or pending-action hydration
- the UI also does not clearly surface backend approval failures back into the card state

Implementation plan

1. Fix the server-side approval hydration bug
- Update `supabase/functions/dash-command/index.ts`
- Make the direct approval path preserve the incoming `direct_approval.pending_action_id` as the final source of truth
- Do not let `hydrateArgsFromDraft()` overwrite it with an undefined value
- Best fix:
  - either remove `pending_action_id` returns from hydrate cases that do not need extra args
  - or merge in this order: `draftArgs` first, then force `pending_action_id` last

2. Normalize all governed write actions
- Audit every action in `ACTION_EXECUTE_MAP` + `hydrateArgsFromDraft()`
- Split them into:
  - actions that need hydrated business fields (`create_shift`, `create_employee`, `time_off`, etc.)
  - actions that only need the server-side pending action ID
- Ensure the second group never depends on `preview_json.pending_action_id`

3. Fix the approval-card UX state machine
- Update:
  - `src/components/dash/ActionPreviewCard.tsx`
  - `src/components/dash/DashMessageList.tsx`
  - `src/hooks/useDashChat.ts`
- Make approval callbacks async and return a real result
- On success: set card to approved
- On retryable failure: revert card from `approving` back to `pending`
- On hard failure: show failed state with retry option
- Also make the card react to later `resolved_status` updates instead of only using initial local state

4. Make typed approvals actually work
- In `supabase/functions/dash-command/index.ts`, add a server-authoritative approval/rejection resolver for plain-text replies like:
  - approve / yes / confirm / go ahead
  - reject / cancel / no
- If there is exactly one pending action for the active user/session/company, route that message through the same direct approval path automatically
- If there are multiple pending actions, return a clarification instead of guessing
- This removes dependence on the model remembering hidden IDs across turns

5. Improve failure signaling from backend to UI
- When direct approval execution fails, return a structured execution result event, not just text
- Keep the pending action retryable when appropriate
- This will let the frontend render a clear error state instead of only showing `⚠️ Missing pending_action_id.` in the transcript

6. Add regression coverage
- Add backend tests for:
  - create shift approval
  - delete shift approval
  - update shift approval
  - swap shift approval
  - one B2/B3 action (for example update employee or create corrective action)
- Specifically test that direct approval preserves the original `pending_action_id`
- Add a small UI test or at minimum a manual QA checklist for card transitions:
  - pending → approving → approved
  - pending → approving → pending on failure
  - reject flow
  - typed “approve” flow

Files most likely to change

- `supabase/functions/dash-command/index.ts`
- `src/hooks/useDashChat.ts`
- `src/components/dash/ActionPreviewCard.tsx`
- `src/components/dash/DashMessageList.tsx`

Validation after fix

- Re-run the exact scenario from your screenshot:
  1. create draft
  2. click Approve & Execute
  3. confirm the shift is actually cancelled
  4. confirm `dash_pending_actions.status` becomes `executed`
  5. confirm the card no longer stays stuck on `Executing...`
- Then verify the same for update shift, swap shift, and one non-workforce governed action
- Then test plain-text approval (“yes, approve it”) to confirm the non-button flow works end-to-end too
