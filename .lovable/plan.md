
Do I know what the issue is? Yes.

This is not one bug. It is a broken contract between Dash approval data, execution tools, and the result UI.

What is actually broken

1. Approval execution is still not generic
- In `supabase/functions/dash-command/index.ts`, direct approval resolves the execute tool, but then calls it with only `{ pending_action_id }`.
- That works for flows that re-hydrate themselves from `dash_pending_actions.preview_json` (`execute_shift_creation`, `execute_ca_reassignment`), but it does not work for `execute_audit_template_creation` or `execute_employee_creation`, which still expect full args.
- Verified by DB: the failed pending action contains `preview_json.name = "LBFC Standard Operating Procedures Audit"` and 14 sections, but execution still inserts `args.template_name`, which is undefined.

2. The result card crashes the page on failures/rejections
- `src/components/dash/ExecutionResultCard.tsx` only supports `success | failure | partial`.
- Backend emits `error` on failed execution and `info` on rejection.
- When that happens, `STATUS_CONFIG[status]` is undefined, causing `Cannot read properties of undefined (reading 'icon')`.

3. Audit template shape is inconsistent with the rest of the app
- Draft stores `name`, execute expects `template_name`.
- Execute inserts `template_type: "location_audit"`, but existing templates in DB use `location`, and app hooks/filtering expect `location | staff`.
- So even after fixing the null-name insert, created templates risk being invisible or misclassified.

4. The action registry is still not fully canonical
- `ACTION_EXECUTE_MAP` uses `reassign_ca`, but the draft action stored is `reassign_corrective_action`.
- That means corrective-action approvals can still fall back incorrectly.

5. Requested custom names are not preserved
- User asked for `TEST_Dash`, but the extracted draft used the document-derived name.
- `parse_uploaded_file` has no optional explicit output-name field, so the approval preview can ignore the user’s requested audit name.

Final fix approach

1. Create one canonical approval execution registry in `supabase/functions/dash-command/index.ts`
- Central map: `action_name -> execute_tool -> module -> hydrateDraftArgs()`.
- Use this registry for:
  - direct approval resolution
  - module gating
  - logging
  - draft-to-execution argument hydration
- Remove all fallback assumptions to shift execution.

2. Hydrate execution args from `dash_pending_actions.preview_json` before calling execute tools
- For audit template approvals, map:
  - `preview_json.name -> template_name`
  - `preview_json.description -> description`
  - `preview_json.sections -> sections`
- Do the same for employee approvals.
- Keep execute tools defensive: if full args are missing but `pending_action_id` exists, they should load and normalize the draft themselves too. That gives a second safety net.

3. Canonicalize audit template payloads end-to-end
- Add a single audit draft normalizer used by:
  - `parse_uploaded_file`
  - `create_audit_template_draft`
  - `execute_audit_template_creation`
- Standardize on:
  - draft key: `name`
  - execution input: normalized from draft
  - inserted `template_type: "location"` (not `"location_audit"`)
- Ensure section/field payloads are normalized once, not reinterpreted differently in each stage.

4. Make execution result statuses safe and explicit
- Backend should emit a canonical status set for `execution_result` (`success | failure | partial | info`).
- Frontend should accept all four and include a fallback config for unknown values.
- `ExecutionResultCard` must never assume the status exists in the map.

5. Fix approval card state so it reflects verified backend outcome
- `ActionPreviewCard` should not rely only on local `approving` state forever.
- Tie card state to the resulting assistant message / execution result / pending action status so failed actions do not leave the UI stuck.

6. Preserve explicit user naming
- Extend `parse_uploaded_file` tool parameters with optional `requested_template_name`.
- When the user says “create audit with the name X”, that name should override the AI-extracted title in the pending draft and final created template.

Files to change
- `supabase/functions/dash-command/index.ts`
- `src/components/dash/ExecutionResultCard.tsx`
- `src/components/dash/ActionPreviewCard.tsx`
- `src/hooks/useDashChat.ts`
- `src/components/dash/DashMessageList.tsx` (only if needed for status plumbing)

Recommended safeguards
- Add edge-function tests for:
  - audit approval from pending action
  - employee approval from pending action
  - corrective-action approval mapping
  - failed execution result rendering contract
  - rejected action result contract

Acceptance checks
- Approving an extracted audit creates the template successfully without `name` null errors.
- The created audit appears in normal audit template lists.
- Failed approvals show a failure card, not a white crash page.
- Rejected approvals show a safe info state.
- Corrective action approvals resolve the correct execute tool.
- If user specifies `TEST_Dash`, the draft preview and final template use `TEST_Dash`.
