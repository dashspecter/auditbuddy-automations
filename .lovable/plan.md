

# Phase 6 — Observability, Hardening & Deeper Automation

## What We're Building

Six improvements to make Dash production-ready: session title generation, error recovery, production hardening, conversation export, idle session archival, and an admin observability dashboard.

---

## Step 1 — Session Title Auto-Generation
**Current**: Session titles use first 100 chars of the first message (line 1689 of edge function).
**Change**: After the LLM response is generated, extract a short 5-8 word title from the first user message using a simple heuristic (first sentence, trimmed). No extra LLM call needed — just smarter truncation.
- **File**: `supabase/functions/dash-command/index.ts` — improve title generation at line ~1689

## Step 2 — Error Recovery & Retry
- Wrap each tool execution in `executeTool` with try/catch, return `{ error, recoverable }` on failure
- Add system prompt instruction: "If a tool returns an error, explain the failure clearly and suggest the user retry"
- Add "Retry" button in `DashMessageList.tsx` when last message contains `⚠️`
- Add `retryLast()` method to `useDashChat.ts` that resends the last user message
- **Files**: `supabase/functions/dash-command/index.ts`, `src/components/dash/DashMessageList.tsx`, `src/hooks/useDashChat.ts`

## Step 3 — Production Hardening
- **Rate limiting**: Add per-user 30 msg/hour counter in edge function using `dash_action_log` count check
- **Input sanitization**: Strip `<system>`, `<|im_start|>`, and similar injection markers from file-extracted content before LLM
- **Max message length**: Cap at 2000 chars in `DashInput.tsx` with character counter
- **Concurrent guard**: Disable send button during file upload (already partially done, tighten)
- **Files**: `supabase/functions/dash-command/index.ts`, `src/components/dash/DashInput.tsx`

## Step 4 — Conversation Export
- Add "Export" button in `DashWorkspace.tsx` header
- Serialize messages to markdown format and trigger browser download as `.md` file
- **File**: `src/pages/DashWorkspace.tsx`

## Step 5 — Idle Session Archival
- Database migration: create `archive_idle_dash_sessions()` function that sets `status = 'archived'` for sessions with `updated_at < NOW() - INTERVAL '4 hours'`
- Set up pg_cron job to run every 30 minutes
- `DashSessionHistory.tsx`: show archived sessions as read-only (no "Resume" button)
- **Files**: Database migration, `src/components/dash/DashSessionHistory.tsx`

## Step 6 — Observability Dashboard
- New page `src/pages/DashAnalytics.tsx` — admin-only route at `/dash/analytics`
- Queries `dash_action_log` and `dash_sessions` for:
  - Total sessions & messages (cards)
  - Tool usage breakdown (list)
  - Success/failure counts
  - Top users by session count
  - Per-module usage
  - Write action approval rates
- New component `src/components/dash/DashUsageStats.tsx` for stat cards
- Add route in `App.tsx` wrapped in `AdminRoute`
- **Files**: `src/pages/DashAnalytics.tsx` (new), `src/components/dash/DashUsageStats.tsx` (new), `src/App.tsx`

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Better titles, error recovery in tools, rate limiting, input sanitization |
| `src/hooks/useDashChat.ts` | Add `retryLast()` |
| `src/components/dash/DashMessageList.tsx` | Retry button on error messages |
| `src/components/dash/DashInput.tsx` | 2000 char limit + counter |
| `src/pages/DashWorkspace.tsx` | Export button |
| `src/components/dash/DashSessionHistory.tsx` | Archived session visual treatment |
| `src/pages/DashAnalytics.tsx` | New — observability dashboard |
| `src/components/dash/DashUsageStats.tsx` | New — stat cards |
| `src/App.tsx` | Add `/dash/analytics` route |
| Database migration | `archive_idle_dash_sessions()` function |
| SQL insert (pg_cron) | Schedule archival job every 30 min |

## Delivery Order
1. Session title generation + error recovery + retry (reliability)
2. Production hardening (security)
3. Conversation export (user value)
4. Idle archival (maintenance)
5. Observability dashboard (admin insights)

