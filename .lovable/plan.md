
Do I know what the issue is? Yes.

What is actually happening
- The toast is misleading. In `useAuditFieldResponses.ts` and `useAuditSectionResponses.ts`, any error containing `row-level security` is rewritten to “Your session has expired”.
- On `/location-audit`, `LocationAudit.tsx` creates a server draft too early:
  - when template changes, it immediately calls `createInitialDraft()`
  - for multi-location templates, `formData.location_id` is still empty at that moment
  - later, when the user chooses a location, the page does not recreate or sync `currentDraftId`
- Result: field, observation, photo, file, and follow-up saves are using a draft row whose `location_id` is `NULL`.

Why that throws RLS
- `audit_field_responses` INSERT policy only checks `audit_id` + `created_by`, so the write can start.
- But the mutation then does `.select().single()`.
- The SELECT policy for responses joins through `location_audits.location_id -> locations`.
- If the parent draft has `location_id = NULL`, the read-back fails with RLS, and the UI falsely says the session expired.

What I verified
- `LocationAudit.tsx` calls `createInitialDraft()` from the template-selection effect before location is guaranteed.
- The location selector only updates `formData.location_id`; it does not re-key or recreate the server draft.
- The discard dialog exists in `LocationAudit.tsx`, but the selectors are not wired to use it.
- Backend data confirms the bug is real:
  - there are 11 `location_audits` drafts with `location_id = NULL`
  - all 11 have `0` responses
  - two were created today for the “Site Visit Checklist (2 Hours)” flow
- Auth logs show valid refresh/login activity for the current user at the same time window, so this is not a genuine expired-session problem.

Why earlier fixes seemed to do nothing
- Earlier work fixed real stale-session issues on other write paths.
- This page has a different bug: invalid draft lifecycle plus misleading error translation.
- Because both problems surface as “RLS”, the toast hid the real cause and made the investigation look finished when it was not.

Implementation plan
1. Fix draft creation order in `src/pages/LocationAudit.tsx`
   - Replace eager `createInitialDraft()` with an `ensureServerDraftReady()` helper.
   - Only create/fetch a server draft when the audit has everything required to be valid:
     - template selected
     - resolved location selected or locked by schedule/template
   - Do not allow field/section/photo/file writes until that helper has produced a valid draft ID.

2. Re-key the server draft when template/location changes
   - Wire the existing discard-confirmation flow back into both selectors.
   - On confirmed template/location change:
     - clear local draft key
     - reset `currentDraftId`
     - reset section state/custom data as needed
     - create or find the correct server draft for the new template/location
   - This prevents writing new answers into an old draft row.

3. Gate the checklist UI until the draft is valid
   - For multi-location templates, require location selection before rendering/activating answer controls.
   - Show a clear “Select location to start saving answers” state instead of letting users interact with an invalid draft.

4. Add a backend safety net
   - Add a validation trigger on `audit_field_responses` and `audit_section_responses` that blocks writes when the parent `location_audits.location_id` is null, with a clear error.
   - This prevents the same bug from silently coming back even if frontend logic regresses.

5. Stop lying with the error message
   - In `useAuditFieldResponses.ts` and `useAuditSectionResponses.ts`, only show “session expired” for actual auth refresh failures.
   - For draft-state failures, show the real issue: draft not ready / location missing / audit must be reinitialized.

6. Reduce fragile write-return-read coupling
   - For background autosaves, remove unnecessary `.select().single()` where the client does not actually need the returned row.
   - Use mutation variables for cache invalidation instead of returned row data.
   - This reduces extra RLS exposure on write return paths.

7. Repair existing broken drafts
   - Add a one-time cleanup for existing `location_audits` drafts with `location_id IS NULL` and no responses.
   - Those rows are already broken and currently useless; cleaning them prevents users from reopening bad server drafts.

Validation plan
- Fresh audit, multi-location template: select template, then location, then first YES/NO answer.
- Change location mid-draft and confirm discard -> new draft ID must be created.
- Change template mid-draft and confirm discard -> new draft ID must be created.
- Add observations before/after answer selection.
- Add photo and file after first answer save.
- Sleep device / change tabs / resume after 5+ minutes.
- Offline edit -> reconnect -> sync.
- Submit after a long session.
- Confirm no `location_audits` draft is created with null `location_id` once a user starts answering fields.

Files likely involved
- `src/pages/LocationAudit.tsx`
- `src/hooks/useAuditFieldResponses.ts`
- `src/hooks/useAuditSectionResponses.ts`
- new migration for validation/cleanup on `location_audits` / response tables

Bottom line
- You are right: the current message is false, and the deep dive stopped at the symptom.
- The core bug is not “session expired”; it is “the audit is writing against an invalid server draft”.
- The proper fix is to correct draft lifecycle first, then keep session guards as a secondary protection.
