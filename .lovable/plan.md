

# Phase 8: Standardize All Capability Modules on Shared Contracts + Permission Enforcement

## What Remains (from the audit)

Two P1 items were identified but **not yet fixed**:

1. **Non-time-off modules return raw objects** — audits, CAs, workforce, operations, overview, memory, file-processing all return `{ error: error.message }` instead of `CapabilityResult<T>`. Only `time-off.ts` uses the shared contract. This means error handling is inconsistent and `resultToToolResponse()` is never called for 7 of 8 modules.

2. **No `checkCapabilityPermission` on non-time-off write operations** — `createAuditTemplateDraft`, `executeAuditTemplateCreation`, `reassignCorrectiveAction`, `createEmployeeDraft`, `executeEmployeeCreation`, `createShiftDraft`, `executeShiftCreation` have zero capability-level permission checks. Any authenticated Dash user can invoke these writes.

---

## What This Phase Delivers

Every capability module upgraded to match the `time-off.ts` reference pattern:
- All functions return `CapabilityResult<T>`
- All write functions call `checkCapabilityPermission` 
- All routing in `executeToolInner` wraps responses with `resultToToolResponse()`
- Consistent error shapes for the LLM across all domains

---

## Changes Per File

### 1. `capabilities/audits.ts`
- Import `CapabilityResult`, `success`, `capabilityError`, `checkCapabilityPermission`, `logCapabilityAction`
- Accept `PermissionContext` param on write functions (`createAuditTemplateDraft`, `executeAuditTemplateCreation`)
- Add `checkCapabilityPermission({ action: "create", module: "location_audits", ctx })` at top of writes
- Wrap returns: reads return `success({ audits, ...meta })`, errors return `capabilityError(msg)`
- Add `logCapabilityAction` on successful template creation

### 2. `capabilities/corrective-actions.ts`
- Same pattern: `CapabilityResult` returns, permission check on `reassignCorrectiveAction` + `executeCaReassignment`
- Module: `"corrective_actions"`, action: `"update"`

### 3. `capabilities/workforce.ts`
- Permission checks on all 4 write functions (employee draft/execute, shift draft/execute)
- Module: `"workforce"`, action: `"create"`
- `CapabilityResult` wrapping on all 6 functions

### 4. `capabilities/operations.ts`
- Read-only module — just wrap returns in `CapabilityResult` (no permission changes needed)

### 5. `capabilities/overview.ts`
- Read-only — wrap returns in `CapabilityResult`

### 6. `capabilities/memory.ts`
- Dash-internal tools — wrap in `CapabilityResult` for consistency, no module permission check (memory is always available)

### 7. `capabilities/file-processing.ts`
- `parseUploadedFile` — wrap in `CapabilityResult`, add permission check for audit-intent paths

### 8. `index.ts` — `executeToolInner` routing
- All non-time-off cases get wrapped: `return resultToToolResponse(await getAuditResults(...))`
- Write cases pass `ctx` (from `buildPermCtx`) to capability functions
- Pattern becomes identical to time-off cases

---

## Implementation Order

1. Update all 7 capability files (can be done in parallel — no interdependencies)
2. Update `executeToolInner` routing to pass `ctx` and wrap with `resultToToolResponse`
3. Deploy and verify

---

## Files Modified

| File | Action |
|------|--------|
| `capabilities/audits.ts` | Add imports, `CapabilityResult` returns, permission checks on writes |
| `capabilities/corrective-actions.ts` | Same |
| `capabilities/workforce.ts` | Same |
| `capabilities/operations.ts` | `CapabilityResult` returns only |
| `capabilities/overview.ts` | `CapabilityResult` returns only |
| `capabilities/memory.ts` | `CapabilityResult` returns only |
| `capabilities/file-processing.ts` | `CapabilityResult` returns + permission check |
| `index.ts` | Wrap all routing with `resultToToolResponse`, pass `ctx` to writes |

