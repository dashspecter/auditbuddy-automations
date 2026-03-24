

# Phase 6A: Migrate Audits, CAs, Workforce, Operations, and Overview into Capability Modules

## Current State
`index.ts` is ~2342 lines. The `executeToolInner` switch (lines 301–1822) contains ~1520 lines of inline domain logic. Time-Off is already migrated to `capabilities/time-off.ts`. The remaining inline tools need migration.

## What Gets Migrated (5 new capability files)

### 1. `capabilities/audits.ts`
Migrates from `index.ts`:
- `get_audit_results` (lines 381–398) — read with data_table emission
- `compare_location_performance` (lines 401–431) — auto-loads locations, data_table
- `create_audit_template_draft` (lines 715–757) — draft creation
- `execute_audit_template_creation` (lines 1011–1133) — full execution with sections/fields
- `parse_uploaded_file` audit-related logic (lines 499–643) — file parsing + auto-draft

### 2. `capabilities/corrective-actions.ts`
Migrates:
- `get_open_corrective_actions` (lines 433–443) — read
- `reassign_corrective_action` (lines 1135–1196) — draft creation
- `execute_ca_reassignment` (lines 1198–1270) — execution

### 3. `capabilities/workforce.ts`
Migrates:
- `search_employees` (lines 309–316) — read
- `get_attendance_exceptions` (lines 453–464) — read
- `create_employee_draft` (lines 646–713) — draft
- `execute_employee_creation` (lines 911–1009) — execution
- `create_shift_draft` (lines 760–908) — complex draft with date resolution, employee lookup
- `execute_shift_creation` (lines 1272–1380) — execution with assignment

### 4. `capabilities/operations.ts`
Migrates (small, grouped):
- `get_task_completion_summary` (lines 445–451)
- `get_work_order_status` (lines 467–477)
- `get_document_expiries` (lines 479–486)
- `get_training_gaps` (lines 488–496)

### 5. `capabilities/overview.ts`
Migrates:
- `get_location_overview` (lines 318–341)
- `get_cross_module_summary` (lines 343–378)
- `search_locations` (lines 303–307)

## What Stays in `index.ts`
- `executeTool` wrapper (module gating, error handling) — stays
- `executeToolInner` becomes a thin routing switch — each case is 1-3 lines calling capability functions
- `buildSystemPrompt` — stays
- LLM loop, SSE streaming, session management — stays
- Direct approval/rejection paths — stays
- `hydrateArgsFromDraft` — stays (orchestration concern)
- All maps (`TOOL_MODULE_MAP`, `ACTION_EXECUTE_MAP`, `ACTION_RISK`) — stay
- `parse_uploaded_file` — stays for now (AI-driven, cross-cutting, not pure domain logic)
- Memory/workflow tools (`save_user_preference`, `get_org_memory`, etc.) — stay (Dash-specific)
- `transform_*` tools — stay (AI-driven transformations)
- File download helper — stays (utility)

## Pattern for Each Capability Function

```typescript
// In capabilities/audits.ts
export async function getAuditResults(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<any> {
  // Domain logic moved from index.ts
  // Emits data_table structured events
  // Returns tool response directly
}
```

Each function receives `sb` (user client), `sbService` (service client where needed), `companyId`, `args`, and `structuredEvents`. Returns the same shape as before — no breaking changes.

## `executeToolInner` After Migration

```typescript
case "get_audit_results":
  return getAuditResults(sb, companyId, args, structuredEvents);
case "compare_location_performance":
  return compareLocationPerformance(sb, companyId, args, structuredEvents);
case "get_open_corrective_actions":
  return getOpenCorrectiveActions(sb, companyId, args);
// ... etc
```

`index.ts` drops from ~2342 to ~1200 lines. All domain logic lives in capability modules.

## Registry Updates
Update `registry.ts` maturity flags:
- `audits`: `"beta"` → `"stable"`
- `corrective_actions`: `"beta"` → `"stable"`
- `workforce`: `"beta"` → `"stable"`
- Add `operations` and `overview` entries

## Implementation Order
1. Create `capabilities/audits.ts` — highest-risk domain (past bugs)
2. Create `capabilities/corrective-actions.ts`
3. Create `capabilities/workforce.ts` — largest (shifts, employees)
4. Create `capabilities/operations.ts` — smallest, grouped
5. Create `capabilities/overview.ts` — composes from other modules
6. Rewrite `executeToolInner` in `index.ts` to route to capability modules
7. Update `registry.ts` maturity flags
8. Deploy

## Files Created/Modified
| File | Action |
|------|--------|
| `capabilities/audits.ts` | **New** |
| `capabilities/corrective-actions.ts` | **New** |
| `capabilities/workforce.ts` | **New** |
| `capabilities/operations.ts` | **New** |
| `capabilities/overview.ts` | **New** |
| `registry.ts` | **Updated** — maturity flags + new entries |
| `index.ts` | **Modified** — inline logic replaced with imports + one-liner calls |

