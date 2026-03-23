

# Phase 2: Dash Hardening — Remaining Risks

## Problems to Fix

### 1. Session restore shows stale approval cards
When reloading a session, `ActionPreviewCard` always initializes with `status: "pending"`. If the pending action was already executed/rejected/expired, the Approve button still appears. Users can click it, which fires a request that will fail (backend checks `pa.status !== "pending"`), but the UX is misleading.

**Fix:** On session restore, reconcile approval card state by checking `dash_pending_actions` status. Pass resolved status into `ActionPreviewCard` so already-executed actions show "Completed" and already-rejected ones show "Rejected" instead of Approve buttons.

### 2. Global error handler returns JSON, not SSE
Line 2441-2443: the top-level `catch` returns `JSON.stringify({ error })` with `Content-Type: application/json`. Frontend expects SSE stream, so `resp.body` exists but SSE parsing fails silently — user sees infinite spinner or empty bubble.

**Fix:** Return errors as SSE streams (same pattern as max-iterations fix).

### 3. AI gateway errors (429, 402, 500) return JSON too
Lines 2286-2290: rate limit, credit depletion, and AI unavailable errors all return raw JSON. Frontend handles 429/402 status codes before streaming, but 500 falls through to `processStream` which fails silently.

**Fix:** These already have status code checks in frontend (lines 263-267), but the 500 case is not handled. Add a generic non-ok check that catches it.

### 4. File parsing has no timeout/AbortController
`parse_uploaded_file` calls Gemini with `stream: false` and no timeout. Large PDFs can stall for 60-120 seconds, potentially hitting Deno's 150s limit. User sees "Analyzing..." with no progress.

**Fix:** Add AbortController with 60-second timeout to the Gemini fetch call in `parse_uploaded_file`. On timeout, return a clear error message. Also emit a `structured_event` of type `execution_result` with status `error` so the user sees a card instead of nothing.

### 5. No correlation IDs for debugging
Requests, tool calls, pending actions, and executions have no shared trace ID, making production debugging nearly impossible.

**Fix:** Generate a `requestId` (UUID) at the start of each request. Pass it through tool calls, log it in `dash_action_log`, `dash_pending_actions`, and console logs. Include it in error messages so support can trace failures.

### 6. Silent `catch {}` blocks swallow errors
Multiple empty catch blocks (session load, session save, clear chat) hide failures completely.

**Fix:** Add `console.error` with context to all empty catch blocks.

## File Changes

| File | Changes |
|------|---------|
| `supabase/functions/dash-command/index.ts` | (1) Global catch returns SSE instead of JSON. (2) Add 60s AbortController to file parsing Gemini call. (3) Generate `requestId` and thread through logs. (4) Add logging to silent catch blocks. |
| `src/hooks/useDashChat.ts` | (1) On session restore, fetch pending action statuses and mark already-executed cards. (2) Add silent-catch logging. |
| `src/components/dash/ActionPreviewCard.tsx` | (1) Accept `initialStatus` prop for restored sessions so already-executed actions don't show Approve. |
| `src/components/dash/DashMessageList.tsx` | (1) Pass `initialStatus` from structured event data to ActionPreviewCard. |

## Implementation Order

1. Fix global catch → SSE (prevents infinite spinners on unexpected errors)
2. Add file parsing timeout (prevents 150s stalls)
3. Session restore reconciliation (prevents stale approval cards)
4. Correlation IDs (debugging infrastructure)
5. Silent catch cleanup (observability)

