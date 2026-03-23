
Root cause verified: this is not an isolated audits bug. Dash is still using legacy, non-canonical module codes in the backend. In `supabase/functions/dash-command/index.ts`, `TOOL_MODULE_MAP` gates audit tools with `"audits"` and task tools with `"tasks"`, but the real activated company module codes are things like `location_audits`, `workforce`, `cmms`, etc. I also verified this company already has `location_audits` active, and there is no `audits` module row at all. That is why Dash shows a false warning even though audits are enabled.

There is a second architectural issue too: the approval flow is still shift-centric. The direct approval path defaults to `execute_shift_creation`, the frontend guesses execute tools from button labels, and the backend logs `modules_touched: ["workforce"]` in the approval path. So earlier shift fixes did not generalize.

Implementation plan

1. Canonicalize module resolution in one backend helper
- Add a single resolver in `supabase/functions/dash-command/index.ts` that maps Dash concepts/tools to real company module codes.
- Normalize:
  - audit tools/actions -> `location_audits`
  - task tools -> either no module gate or a deliberate canonical mapping based on current app rules
  - keep valid codes like `workforce`, `documents`, `cmms`, `corrective_actions` as-is
- Replace raw `TOOL_MODULE_MAP[name]` checks with this helper everywhere.

2. Make approval execution server-authoritative
- Stop relying on the frontend’s label-based heuristic to decide which execute tool to run.
- In the direct approval path, resolve the execute tool from `dash_pending_actions.action_name` on the backend (`create_shift` -> `execute_shift_creation`, `create_audit_template` -> `execute_audit_template_creation`, etc.).
- Remove the shift-default assumption so audits, employees, corrective actions, and future flows all use the same pattern.

3. Fix audit flows before approval is even shown
- Apply the canonical module check to audit entry points too:
  - `parse_uploaded_file` when intent is audit/compliance
  - `create_audit_template_draft`
- This prevents false audit warnings for enabled companies, and also prevents truly disabled companies from getting a misleading approval card that later fails on approval.

4. Clean up logging and approval-state consistency
- Replace fake/hardcoded module logging (`"audits"`, `"tasks"`, always `["workforce"]`) with canonical module values from the new helper.
- Reconcile the approval card state so a failed approval does not remain stuck on “Executing...”.
- Keep pending action state coherent when execution is blocked, instead of leaving a misleading pending card created under the wrong module assumption.

Files to update
- `supabase/functions/dash-command/index.ts`
- `src/components/dash/DashMessageList.tsx`
- `src/components/dash/ActionPreviewCard.tsx`
- `src/hooks/useDashChat.ts` (if needed for approval failure state propagation)

Acceptance checks
- An audit template approval no longer shows `The "audits" module is not active` when `location_audits` is enabled.
- Dash approvals work consistently across audits, shifts, employees, and corrective actions without shift-specific fallbacks.
- Dash no longer logs or gates against nonexistent module codes like `audits` or `tasks`.
- If a module is truly unavailable, Dash blocks it at the correct step with an accurate message before creating a broken approval flow.
