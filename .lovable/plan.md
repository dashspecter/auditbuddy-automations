

# Next Phase: QA Fixes + Phase 2 (Draft-Based Creation)

## Step 1 — Apply QA Blockers (must do first)

| Fix | What |
|-----|------|
| Documents RLS | Replace open SELECT policy with `company_id = get_user_company_id(auth.uid())` |
| Edge fn `.single()` | Change to `.maybeSingle()` + `order("created_at")` + `.limit(1)` in `dash-command/index.ts` |
| Route protection | Wrap `/dash` in `ManagerRoute` in `App.tsx` |
| Module gating | Add `TOOL_MODULE_MAP` check at top of `executeTool` in edge function |

## Step 2 — Session Persistence

- On assistant response completion, upsert conversation to `dash_sessions`
- On DashPanel/DashWorkspace mount, load last active session
- Add "New conversation" button to clear and start fresh
- Add session list/history in DashPanel sidebar

## Step 3 — Structured Event Cards

- Emit structured SSE events from edge function (source_card, data_table, clarification)
- Parse structured events in `useDashChat.ts` and attach to messages as `structured` array
- Build and render: `SourceCard.tsx`, `DataTableCard.tsx`, `ClarificationCard.tsx`
- Wire into `DashMessageList.tsx` to render cards inline with markdown

## Step 4 — File Upload Pipeline

- Add file upload button to `DashInput.tsx` (images, PDFs, spreadsheets)
- Upload to Supabase Storage bucket, pass signed URL to edge function
- Add `parse_uploaded_file` tool that classifies file type and extracts content
- Add `extract_id_document` tool wrapping existing `scan-id-document` edge function
- Add `transform_pdf_to_template` tool for audit template extraction

## Step 5 — Draft-Based Creation Flows

- **Employee from ID**: Extract data → show draft card → ask missing fields → create on approval
- **Audit template from PDF**: Parse sections/questions → show template draft card → configure scoring/recurrence → create on approval
- Build `ActionPreviewCard.tsx` — shows draft summary with approve/reject buttons
- Build `ApprovalCard.tsx` — structured confirmation with affected entities list
- Wire approval flow: user confirms → edge function executes governed write → returns `ExecutionResultCard`

## Step 6 — Missing-Info Clarification Flow

- When tool detects missing required fields, emit `clarification` structured event
- UI renders inline question with option buttons or text input
- User response feeds back into the tool-calling loop

## Files to create/modify

| File | Action |
|------|--------|
| Database migration | Fix `documents` RLS |
| `supabase/functions/dash-command/index.ts` | Fix `.single()`, add module gating, add file tools, add write tools, emit structured events |
| `src/App.tsx` | Wrap `/dash` in `ManagerRoute` |
| `src/hooks/useDashChat.ts` | Session persistence, structured event parsing |
| `src/components/dash/SourceCard.tsx` | New — entity reference chips |
| `src/components/dash/DataTableCard.tsx` | New — inline data tables |
| `src/components/dash/ActionPreviewCard.tsx` | New — draft preview with approve/reject |
| `src/components/dash/ApprovalCard.tsx` | New — confirmation card |
| `src/components/dash/ExecutionResultCard.tsx` | New — success/failure summary |
| `src/components/dash/ClarificationCard.tsx` | New — inline question card |
| `src/components/dash/DashInput.tsx` | Add file upload |
| `src/components/dash/DashMessageList.tsx` | Render structured cards inline |
| `src/components/dash/DashPanel.tsx` | Session history list |

## Delivery order

1. QA fixes (migration + edge fn + route) — ship immediately
2. Session persistence — enables continuity
3. Structured event cards — enables rich responses
4. File upload pipeline — enables document ingestion
5. Draft creation flows (employee + audit template) — the flagship Phase 2 deliverables
6. Clarification flow — polishes the multi-step UX

