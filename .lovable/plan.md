

# Dash Command Center — Architecture & Build Plan

## Executive Assessment

Your spec is comprehensive and clear. The existing codebase provides a strong foundation to build on. Here is the full current-state AI audit, architecture design, and phased implementation plan.

---

## PART A — Current AI Foundation Audit

### Component Classification

| Component | Lines | Status | Verdict |
|-----------|-------|--------|---------|
| **ai-guide-chat** (edge fn) | 1489 | Stable, streaming, tool-calling, DST-safe, PII-gated, auth-validated | **KEEP — EXTRACT & EVOLVE** into Dash backend |
| **AIGuideChat.tsx** (UI) | 317 | Basic dialog/sheet, no structured cards, no markdown rendering, no memory | **REPLACE FROM ZERO** |
| **agent-orchestrator** (edge fn) | 332 | Generic policy→workflow engine, hardcoded 4-step plans, no real tool execution, no LLM | **DEPRECATE** |
| **operations-agent** (edge fn) | 614 | Deterministic SLA/maintenance/daily-ops generator, no LLM, useful domain logic | **EXTRACT USEFUL PARTS** — wrap as Dash read tools |
| **workforce-agent** (edge fn) | 737 | Payroll prep, scheduling analysis, attendance risk detection, no LLM | **EXTRACT USEFUL PARTS** — wrap as Dash read tools |
| **generate-site-visit-report** | 182 | Gemini streaming from audit data → markdown report | **KEEP WITH REFACTOR** — register as Dash action |
| **generate-insight-summary** | 122 | Simple alert→HTML summary via Gemini | **KEEP WITH REFACTOR** |
| **scan-id-document** | 198 | Gemini vision for Romanian ID extraction, auth-validated | **KEEP AS-IS** — register as Dash file tool |
| **ai-fill-contract** | ~200 | Gemini contract auto-fill | **KEEP AS-IS** — register as Dash action |
| **generate-test-questions** | ~150 | Gemini quiz generation | **KEEP AS-IS** |
| **agent_tasks table** | — | Used only by orchestrator | **REPURPOSE** for Dash action log |
| **agent_workflows table** | — | Hardcoded 4-step stubs | **REPURPOSE** for Dash multi-step workflows |
| **agent_logs table** | — | Good schema, company-scoped | **KEEP — extend for Dash observability** |
| **agent_memory table** | — | Simple key-value, no user scoping, no type safety | **REPLACE** with new Dash memory schema |
| **agent_policies table** | — | Condition→action rules, unused in practice | **DEPRECATE** (Dash uses its own registry) |
| **useAgents.ts hook** | — | Wraps orchestrator | **DEPRECATE** alongside orchestrator |
| **useOperationsAgent.ts** | — | Direct fetch calls to ops-agent endpoints | **KEEP WITH REFACTOR** — point to Dash tools |
| **useWorkforceAgent.ts** | — | Wraps workforce-agent invoke calls | **KEEP WITH REFACTOR** |

### Reusable Platform Pieces (No Changes Needed)

These are stable and Dash will integrate with them as-is:
- Route guards (AdminRoute, ManagerRoute, ProtectedRoute, ModuleGate, etc.)
- RLS policies and `get_user_company_id`, `has_role`, `has_company_role` functions
- `role_template_permissions` and `useUserTemplatePermissions`
- `company_modules` and module gating
- Activity logs, notification system, upload pipelines
- Document parsing (`parse-document`), ID scanning, evidence packets
- Recurring engines (audits, maintenance, notifications)
- Materialized views and snapshot functions
- All existing dashboards and portals

---

## PART B — Target Architecture

```text
┌─────────────────────────────────────────────────────┐
│                  DASH COMMAND CENTER                  │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Side Panel   │  │ Full Screen  │  │  Mobile    │  │
│  │ (Dashboard)  │  │ Workspace    │  │  Adapted   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         └────────────────┼────────────────┘          │
│                          ▼                            │
│              ┌───────────────────┐                    │
│              │  React Chat Engine │                   │
│              │  (streaming, cards, │                  │
│              │   markdown, actions)│                  │
│              └─────────┬─────────┘                    │
│                        ▼                              │
│         ┌──────────────────────────┐                  │
│         │    dash-command edge fn   │                 │
│         │  ┌────────────────────┐  │                 │
│         │  │ Orchestration Core │  │                 │
│         │  │  - Intent classify │  │                 │
│         │  │  - Entity resolve  │  │                 │
│         │  │  - Permission gate │  │                 │
│         │  │  - Tool dispatch   │  │                 │
│         │  │  - Result compose  │  │                 │
│         │  └────────┬───────────┘  │                 │
│         │           ▼              │                  │
│         │  ┌────────────────────┐  │                 │
│         │  │   Tool Registry    │  │                 │
│         │  │  READ tools (safe) │  │                 │
│         │  │  WRITE tools (gov) │  │                 │
│         │  │  FILE tools (parse)│  │                 │
│         │  └────────┬───────────┘  │                 │
│         │           ▼              │                  │
│         │  ┌────────────────────┐  │                 │
│         │  │ Permission Engine  │  │                 │
│         │  │ Validation Engine  │  │                 │
│         │  │ Approval Engine    │  │                 │
│         │  │ Memory Engine      │  │                 │
│         │  │ Audit Logger       │  │                 │
│         │  └────────────────────┘  │                 │
│         └──────────────────────────┘                  │
│                        ▼                              │
│    ┌──────────────────────────────────────┐           │
│    │    EXISTING DASHSPECT PLATFORM        │          │
│    │  (audits, workforce, tasks, CMMS,     │          │
│    │   CAs, documents, notifications...)   │          │
│    └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

### Layer Breakdown

1. **Conversational Experience Layer** — New React UI (side panel + full workspace + mobile)
2. **Orchestration Layer** — Single `dash-command` edge function with LLM tool-calling loop
3. **Entity & Capability Registry** — JSON config files defining entities, actions, permissions
4. **Read Tool Layer** — Server-side query functions (evolve from ai-guide-chat tools + new cross-module tools)
5. **Write Tool Layer** — Governed action functions with risk classification
6. **Permission Engine** — Runtime checks using existing RLS + role_template_permissions + company_modules
7. **Validation Engine** — Pre-execution field/entity/relationship validation
8. **Approval Engine** — Structured confirmation flow with logging
9. **Memory Layer** — New tables: `dash_sessions`, `dash_user_preferences`, `dash_org_memory`, `dash_saved_workflows`
10. **File Ingestion Layer** — Reuse `scan-id-document`, `parse-document`, add new transformation tools
11. **Observability Layer** — Extend `agent_logs` → `dash_audit_log` with structured event schema

---

## PART C — Database Schema Additions

### New Tables

```sql
-- Dash conversation sessions
dash_sessions (id, company_id, user_id, title, messages_json, 
  status, created_at, updated_at)

-- User preferences for Dash
dash_user_preferences (id, company_id, user_id, preference_key, 
  preference_value, created_at, updated_at)
  -- UNIQUE(company_id, user_id, preference_key)

-- Organization-level Dash memory
dash_org_memory (id, company_id, memory_type, memory_key, 
  content_json, created_by, created_at, updated_at)

-- Saved reusable workflows
dash_saved_workflows (id, company_id, user_id, name, 
  description, workflow_json, created_at, updated_at)

-- Dash action audit log (extends/replaces agent_logs for Dash)
dash_action_log (id, company_id, user_id, session_id, 
  action_type, action_name, risk_level, 
  request_json, result_json, status, 
  approval_status, entities_affected, 
  modules_touched, created_at)

-- Dash pending approvals
dash_pending_actions (id, company_id, user_id, session_id,
  action_name, risk_level, preview_json, 
  status, approved_at, approved_by, created_at)
```

All tables: RLS with `company_id = get_user_company_id(auth.uid())`.

### Repurposed Tables
- `agent_logs` — keep for legacy agent compat, new Dash uses `dash_action_log`
- `agent_tasks`, `agent_workflows` — freeze, no new writes from Dash

---

## PART D — Edge Function Design

### Primary: `dash-command/index.ts`

Single edge function handling all Dash interactions via streaming tool-calling loop:

1. **Auth** — Validate JWT, resolve user/company/role/permissions/modules
2. **Context** — Build runtime context (company, locations, modules, role template)
3. **LLM Call** — Gemini with system prompt + tool definitions + conversation history
4. **Tool Loop** — Execute tool calls server-side, return results to LLM, repeat
5. **Stream** — SSE stream tokens + structured events (cards, approvals, results)

### Tool Categories Registered in the Function

**Read Tools** (Phase 1):
- `search_employees`, `get_employee_profile`, `list_shifts`, `list_attendance_logs`
- `get_audit_results`, `compare_location_performance`, `get_open_corrective_actions`
- `get_task_completion_summary`, `get_training_gaps`, `get_document_expiries`
- `get_work_order_status`, `get_attendance_exceptions`, `get_weekly_pack`
- `get_location_overview`, `get_payroll_summary`

**Write Tools** (Phase 3):
- `create_employee_draft`, `create_audit_template_draft`
- `reassign_corrective_action`, `create_shift_draft`
- `create_notification`, `create_work_order`

**File Tools** (Phase 2):
- `parse_uploaded_file`, `extract_id_document`, `transform_pdf_to_template`

### Structured SSE Events

Beyond text tokens, stream structured events for rich UI:

```json
{"type": "text", "content": "..."}
{"type": "source_card", "data": {"module": "audits", "entity": "...", "id": "..."}}
{"type": "data_table", "data": {"columns": [...], "rows": [...]}}
{"type": "action_preview", "data": {"action": "...", "risk": "medium", "summary": "...", "affected": [...]}}
{"type": "approval_request", "data": {"action_id": "...", "summary": "...", "details": {...}}}
{"type": "execution_result", "data": {"status": "success", "changes": [...]}}
{"type": "clarification", "data": {"question": "...", "options": [...]}}
```

---

## PART E — UI/UX Design

### 1. Dashboard Side Panel
- Collapsible right-side panel (replaces current AIGuideChat dialog)
- Shows: company/location scope, quick input, recent conversations, suggestions
- Persistent across dashboard navigation

### 2. Full Command Center Workspace (`/dash`)
- New route, gated by module enablement + role permissions
- Left: conversation timeline with structured cards
- Right: context panel (sources, affected entities, action previews)
- Bottom: saved workflows, execution history

### 3. Mobile Experience
- Bottom sheet (like current AIGuideChat but elevated)
- Structured cards render inline
- Approval confirmations as modal cards

### UI Components to Build
- `DashPanel.tsx` — side panel container
- `DashWorkspace.tsx` — full-screen workspace page
- `DashMessageList.tsx` — conversation timeline with markdown + structured cards
- `DashInput.tsx` — rich input with file upload, voice (future)
- `SourceCard.tsx` — entity reference chips
- `ActionPreviewCard.tsx` — draft/action preview with approve/reject
- `ExecutionResultCard.tsx` — success/failure summary
- `DataTableCard.tsx` — inline data tables
- `ApprovalCard.tsx` — structured approval flow
- `DashScopeBar.tsx` — current tenant/location/user context

---

## PART F — Phased Delivery Plan

### Phase 0 — Foundation (Week 1)
- Create database tables (dash_sessions, dash_user_preferences, dash_action_log, dash_pending_actions)
- Create `dash-command` edge function skeleton with auth, context, and streaming
- Build entity registry and read tool registry (JSON config)
- Build base UI: DashPanel + DashWorkspace + DashMessageList + DashInput
- Wire streaming SSE rendering with markdown support
- Replace AIGuideChat sidebar trigger with Dash panel trigger

### Phase 1 — Read-Only Command Center (Week 2-3)
- Implement 15+ read tools covering all major modules
- Cross-module problem summary flow
- Location comparison flow
- Weekly manager pack flow
- Source cards and data table rendering
- Conversation persistence (dash_sessions)
- Scope-aware context bar

### Phase 2 — Draft-Based Creation (Week 3-4)
- File upload + transformation pipeline
- Employee onboarding from ID scan flow
- Audit template from PDF flow
- ActionPreviewCard + ApprovalCard UI
- Draft save/edit/confirm workflow
- Missing-info clarification flow

### Phase 3 — Approval-Gated Writes (Week 4-5)
- Write tool layer with risk classification
- Corrective action management flow
- Shift/schedule creation flow
- dash_pending_actions table + approval backend
- Execution result cards
- Action audit logging

### Phase 4 — Memory & Saved Workflows (Week 5-6)
- User preference memory (report format, time windows, favorite locations)
- Organization memory (terminology, standard processes)
- Saved workflow shortcuts ("usual weekly pack")
- Workflow replay/reuse

### Phase 5 — File Transformation Expansion (Week 6-7)
- Checklist image → QR form template
- Spreadsheet → schedule import
- SOP → training module draft
- Compliance doc → recurring audit suggestion

---

## PART G — Security Enforcement

- All tools execute server-side in `dash-command` using service_role for reads, but always filter by `company_id`
- User JWT validated on every request; role/permissions resolved at runtime
- Module gating checked before tool execution
- Write tools validate entity ownership + company scope before execution
- No raw SQL exposure; all queries through typed tool functions
- File content sanitized before LLM processing (strip injection attempts)
- Memory strictly tenant-isolated with RLS
- All material actions logged to `dash_action_log`
- Cross-tenant requests blocked with clear error messages

---

## PART H — Implementation Task Order

1. Database migrations (6 new tables + RLS)
2. `dash-command` edge function — auth + context + streaming skeleton
3. Entity registry JSON + read tool registry JSON
4. First 5 read tools (employees, audits, tasks, attendance, CAs)
5. DashPanel + DashWorkspace + DashMessageList + DashInput components
6. Structured SSE event parsing + card rendering
7. Route setup (`/dash`) + sidebar integration
8. Conversation persistence (dash_sessions)
9. Remaining read tools (10+ more)
10. Cross-module summary flow (Flow 1)
11. Weekly pack flow (Flow 5)
12. File upload pipeline + scan-id integration (Flow 2)
13. PDF→audit template transformation (Flow 3)
14. ActionPreviewCard + ApprovalCard
15. Write tools + validation + risk classification
16. CA management flow (Flow 4)
17. dash_action_log observability
18. Memory system (preferences + org memory + saved workflows)
19. Deprecate old AIGuideChat, agent-orchestrator references
20. Mobile optimization pass

---

## Summary

Your spec is thorough and buildable. The existing platform provides all the domain logic, security infrastructure, and data layer needed. The key insight from the audit: the current `ai-guide-chat` edge function is the strongest AI piece (1489 lines of well-structured tool-calling code) and becomes the evolutionary base for `dash-command`. The `agent-orchestrator`, `agent_policies`, and `agent_memory` are architectural dead-ends that should be deprecated rather than extended.

The build is large but modular — each phase delivers standalone value. Phase 0+1 alone gives you a production-ready read-only command center that is already more powerful than any existing AI feature in the platform.

