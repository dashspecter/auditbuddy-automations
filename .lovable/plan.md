
# Dash Hardening — Phase 1 Complete

## Fixes Applied

### Backend (`supabase/functions/dash-command/index.ts`)

| # | Fix | Status |
|---|-----|--------|
| C1 | Stale success message updated — now says "created successfully" | ✅ |
| C2 | CA action_preview event shape normalized to standard `action`, `summary`, `risk`, `affected`, `pending_action_id`, `can_approve` | ✅ |
| C3 | Employee execution self-hydrates from `preview_json` when called via direct approval with only `pending_action_id` | ✅ |
| C4 | Direct approval session save now includes structured events for session reload | ✅ |
| C5 | `hydrateArgsFromDraft` now covers `create_shift` and `reassign_corrective_action` cases | ✅ |
| R4 | Max-iterations error now returns SSE stream instead of raw JSON | ✅ |
| U1 | `requested_template_name` parameter added to `parse_uploaded_file` — user-specified names override AI-extracted titles | ✅ |
| O2 | Silent `catch {}` blocks in direct approval path now log errors | ✅ |

### Frontend (`src/hooks/useDashChat.ts`)

| # | Fix | Status |
|---|-----|--------|
| R1 | 90-second stream timeout watchdog — aborts reader if no data arrives | ✅ |
| R2 | Empty-response guard — shows fallback message if stream ends with no content | ✅ |
| R3 | `cancelStream` now adds "Request cancelled" message if no assistant response started | ✅ |

### Frontend (`src/components/dash/ActionPreviewCard.tsx`)

| # | Fix | Status |
|---|-----|--------|
| S1 | Added `failed` state — card resets from "Executing..." on error, with Retry button | ✅ |
| S3 | Duplicate click prevention — approve/reject only fires from `pending` state | ✅ |

## Phase 2 (Next Session)

- Session restore: reconcile pending action status from DB on load
- File parsing timeout with AbortController  
- Correlation IDs for debugging
- Duplicate action log prevention
