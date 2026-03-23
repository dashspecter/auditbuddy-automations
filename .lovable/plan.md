

# Dash Hardening: Full Audit & Implementation Plan

## A. Current-State Audit — Root-Cause Issue List

### Correctness Bugs

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| C1 | **Stale success message**: Line 1512 says `"created (inactive/draft)"` but template is now created as `is_active: true` | Medium | `index.ts:1512` |
| C2 | **CA action_preview uses wrong event shape**: `reassign_corrective_action` emits `action_preview` with fields `title`, `description`, `preview` instead of the standard `action`, `summary`, `risk`, `affected`, `pending_action_id`, `can_approve`. ActionPreviewCard cannot render it. | High | `index.ts:1566-1579` |
| C3 | **Employee execution doesn't self-hydrate**: Unlike audit templates, `execute_employee_creation` has no fallback to load `preview_json` when called via direct approval with only `pending_action_id`. `hydrateArgsFromDraft` provides `full_name`, `email`, `phone`, `role`, `department_id`, `location_id` but misses `cnp`, `date_of_birth`, `id_series`, `id_number`, `address`, `start_date`. | High | `index.ts:1314-1400`, `hydrateArgsFromDraft:52-61` |
| C4 | **Direct approval session save doesn't include structured events**: Line 2130-2136 saves session with `resultText` only, losing the `execution_result` structured events. On session reload, no execution result card appears. | Medium | `index.ts:2125-2137` |
| C5 | **`create_shift_draft` hydration missing**: `hydrateArgsFromDraft` has no `create_shift` case — falls through to default `{}`. Shift execution already self-hydrates via `pa.preview_json`, so this works, but the pattern is inconsistent. | Low | `hydrateArgsFromDraft:43-65` |

### Reliability Bugs

| # | Issue | Severity |
|---|-------|----------|
| R1 | **No stream timeout**: `processStream` in `useDashChat` reads forever. If backend hangs or SSE connection stalls, UI shows infinite spinner with no recovery. | Critical |
| R2 | **No empty-response guard on frontend**: If stream ends with no text content and no structured events, the last message stays as the user's — `isLoading` clears but nothing visible happened. | High |
| R3 | **cancelStream doesn't add fallback message**: User cancels, `isLoading` goes false, but if no assistant message was started, the conversation just has a dangling user message with no response. | Medium |
| R4 | **Backend max-iterations returns JSON, not SSE**: Line 2384 returns `{ error: "Max iterations exceeded" }` as JSON. Frontend expects SSE streaming, so `resp.body` exists but parsing fails silently. | High |
| R5 | **File parsing AI call has no timeout**: `parse_uploaded_file` calls Gemini with `stream: false` and potentially very large PDFs. No AbortController or timeout. Can stall the entire edge function until Deno's 150s limit. | High |

### State-Model Bugs

| # | Issue | Severity |
|---|-------|----------|
| S1 | **Approval card stays "Executing..." forever on failure**: `ActionPreviewCard` sets local `status: "approving"` on click but never transitions to `failed` or `done`. If the backend returns an error, the card remains stuck. | High |
| S2 | **Session restore doesn't reconcile pending action status**: On reload, approval cards from `messages_json` show `can_approve: true` even if the action was already executed/rejected/expired. | High |
| S3 | **Duplicate approval risk**: No frontend debounce or backend idempotency guard. If user double-clicks Approve before `isLoading` kicks in, two `direct_approval` requests can fire. Backend checks `pa.status !== "pending"` which provides some protection, but the second call still executes tool resolution before the check. | Medium |

### UX Ambiguity Bugs

| # | Issue | Severity |
|---|-------|----------|
| U1 | **User-requested name not preserved**: No `requested_template_name` parameter on `parse_uploaded_file`. User says "create audit named X" but gets AI-extracted title. | Medium |
| U2 | **No visible parsing progress**: File parsing can take 10-30 seconds with no progress indication beyond the generic "Analyzing..." spinner. | Medium |

### Observability Gaps

| # | Issue | Severity |
|---|-------|----------|
| O1 | **No correlation ID**: Requests, tool calls, pending actions, and executions have no shared trace ID. Debugging requires manual timestamp correlation. | Medium |
| O2 | **Catch-all silences**: Multiple `catch {}` blocks (lines 85, 263, 2107, 2122, 2136) swallow errors completely — no logging, no metrics. | Medium |
| O3 | **Direct approval action log duplicates**: The direct approval path logs to `dash_action_log` at line 2115, but the execute tool itself (e.g., `execute_audit_template_creation`) also logs at line 2494. Results in duplicate log entries. | Low |

---

## B. Ordered Implementation Plan

Given the scope, I'll focus on the **high-impact, fixable-now** items that make Dash actually work reliably. I explicitly deprioritize aspirational state-machine formalism and test harness infrastructure in favor of concrete bug fixes.

### Phase 1: Fix What's Broken (This Session)

**1. Fix stale success message (C1)**
- `index.ts:1512`: Change `"created (inactive/draft)"` to `"created successfully. You can find it in Audit Templates."`

**2. Fix CA action_preview event shape (C2)**
- `index.ts:1566-1579`: Restructure to use standard `action`, `summary`, `risk`, `affected`, `pending_action_id`, `can_approve` fields so `ActionPreviewCard` renders correctly.

**3. Complete employee hydration (C3)**
- Expand `hydrateArgsFromDraft` `create_employee` case to include all fields from preview_json.
- Add self-hydration fallback in `execute_employee_creation` (same pattern as audit template).

**4. Add shift hydration to `hydrateArgsFromDraft` (C5)**
- Add `create_shift` case mapping all draft fields.

**5. Fix direct approval session save to include structured events (C4)**
- Line 2125-2137: Include `allStructuredEvents` in the saved `messages_json` assistant message, same as the normal flow does.

**6. Add stream timeout watchdog (R1)**
- In `useDashChat.processStream()`: Start a 90-second timeout timer. Reset on each received chunk. If no data arrives for 90s, abort the reader and surface a recoverable error message.

**7. Add empty-response guard (R2)**
- After `processStream` completes, if `assistantContent` is empty and no structured events were received, append a fallback message: "Something went wrong — no response received. Please try again."

**8. Fix cancelStream to add fallback message (R3)**
- When `abortRef.current.abort()` is called, check if an assistant message was started. If not, add a "Request cancelled" message.

**9. Fix max-iterations to return SSE (R4)**
- Line 2384: Return the error as an SSE stream instead of raw JSON, matching the expected response format.

**10. Fix ActionPreviewCard stuck state (S1)**
- Pass execution result status back to the card via structured events. When an `execution_result` event appears in the same message's structured events, update the card's visual state accordingly.
- Simpler approach: After approval stream completes, the execution_result card appears as a separate structured event. The approval card is already in a prior message and won't update. This is actually fine — the execution result card in the new message serves as the final state indicator. The "Executing..." label is misleading only if the stream fails. Fix: if the approval fetch throws or returns error, reset card state to `pending`.

**11. Add user-requested name support (U1)**
- Add optional `requested_template_name` parameter to `parse_uploaded_file` tool definition.
- In the extraction logic, if `requested_template_name` is provided, use it instead of the AI-extracted name.

**12. Add `requested_template_name` to system prompt instructions**
- Tell the LLM: "When the user specifies a name for the audit template, pass it as `requested_template_name` to `parse_uploaded_file`."

### Phase 2: Resilience (Next Session)

- Session restore: reconcile pending action status from DB on load
- Duplicate approval prevention (frontend debounce)
- File parsing timeout with AbortController
- Correlation IDs
- Silent catch cleanup
- Duplicate action log prevention

---

## C. File Changes

| File | Changes |
|------|---------|
| `supabase/functions/dash-command/index.ts` | Fix C1 (line 1512), C2 (CA event shape), C3 (employee hydration), C4 (session save), C5 (shift hydration), R4 (max iterations SSE), U1 (requested_template_name), O3 (duplicate log guard) |
| `src/hooks/useDashChat.ts` | R1 (stream timeout), R2 (empty response guard), R3 (cancel fallback), S1 (approval card error recovery) |
| `src/components/dash/ActionPreviewCard.tsx` | S1 (reset to pending on error) |

---

## D. Risks Remaining After This Pass

1. **File parsing can still timeout** on very large PDFs (Deno 150s limit). True fix requires async job pattern — deferred to Phase 2.
2. **Session restore still trusts stale card state** — cards from old sessions may show Approve on already-executed actions. Phase 2.
3. **No correlation IDs yet** — debugging still requires timestamp matching. Phase 2.
4. **No automated test harness** — manual testing remains primary validation. Phase 2.

