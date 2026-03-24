

# Shared Capability Layer + Time-Off Reference Implementation

## What This Delivers

A modular architecture inside `supabase/functions/dash-command/` that replaces Dash's current monolithic 2532-line `index.ts` with a structured capability system. Time-Off becomes the first domain implemented through this shared layer, serving as the canonical pattern for every future module.

After this work:
- Dash can create, approve, reject, and cancel time-off requests through conversation
- Dash uses shared validation, permissions, and result contracts — not ad-hoc DB queries
- A capability registry describes what Dash knows and can do, making future module onboarding mechanical
- The existing monolith is preserved during migration — new tools use the shared layer, old tools continue working and migrate incrementally

---

## Architecture

```text
supabase/functions/dash-command/
├── index.ts                 ← Orchestration only (LLM loop, SSE, routing)
├── registry.ts              ← Capability registry (modules, tools, aliases)
├── capabilities/
│   └── time-off.ts          ← Time-Off reads + actions (reference impl)
├── shared/
│   ├── constants.ts         ← Status values, column names, module codes
│   ├── contracts.ts         ← CapabilityResult<T> type + builders
│   ├── permissions.ts       ← Role/module/tenant checks
│   ├── validation.ts        ← Date range, overlap, balance validators
│   └── logging.ts           ← Audit log helper
└── tools.ts                 ← Tool definitions array (extracted from index.ts)
```

**Important constraint**: Supabase Edge Functions don't share modules across function directories. Everything lives inside `dash-command/` but is logically separated into files imported via relative paths.

---

## Implementation Phases

### Phase 1: Shared Foundation (no behavior change)

Create the 5 shared utility files that all future capabilities will import.

**`shared/constants.ts`**
- `AUDIT_FINISHED_STATUSES` (extracted from current line 15)
- `TIME_OFF_STATUSES = { pending, approved, rejected }`
- `TIME_OFF_TYPES = { vacation, sick, personal }`
- `EMPLOYEE_ACTIVE_STATUS = "active"`
- `LOCATION_ACTIVE_STATUS = "active"`

**`shared/contracts.ts`**
```typescript
type CapabilityResult<T> =
  | { ok: true; data: T; meta?: { count?: number; truncated?: boolean } }
  | { ok: false; code: 'validation_error'; errors: string[] }
  | { ok: false; code: 'permission_denied'; reason: string }
  | { ok: false; code: 'not_found'; entity: string; id?: string }
  | { ok: false; code: 'conflict'; details: string }
  | { ok: false; code: 'module_disabled'; module: string }
  | { ok: false; code: 'error'; message: string }
```
Plus builder functions: `success(data)`, `validationError(errors)`, `permissionDenied(reason)`, etc.

**`shared/permissions.ts`**
- `checkCapabilityPermission({ action, module, companyId, actorUserId, targetEmployeeId?, activeModules, platformRoles, companyRole })` → `CapabilityResult<true>`
- Checks: module enabled, tenant boundary, role authority (owners/admins/managers can approve; employees can only self-service)
- Reuses existing role resolution pattern from index.ts lines 2158-2173

**`shared/validation.ts`**
- `validateDateRange(start, end)` — end >= start, not in past for new requests
- `calculateDays(start, end)` — inclusive day count (mirrors StaffTimeOff.tsx line 101-106)
- `checkOverlap(sb, employeeId, startDate, endDate, excludeId?)` — checks approved/pending requests
- `checkBalance(sb, employeeId, year, totalDays, newDays)` — sufficient remaining days

**`shared/logging.ts`**
- `logCapabilityAction(sbService, { companyId, userId, sessionId, capability, actionType, riskLevel, request, result, entitiesAffected, module })`
- Writes to `dash_action_log` with consistent structure

---

### Phase 2: Capability Registry

**`registry.ts`**
```typescript
const CAPABILITY_REGISTRY = {
  time_off: {
    module: 'workforce',
    entities: ['time_off_request', 'employee'],
    aliases: ['vacation', 'leave', 'day off', 'PTO', 'sick leave', 'personal day', 'concediu', 'zi libera'],
    reads: ['get_time_off_balance', 'list_time_off_requests', 'list_pending_time_off_approvals', 'check_time_off_conflicts', 'get_team_time_off_calendar'],
    actions: ['create_time_off_request', 'approve_time_off_request', 'reject_time_off_request', 'cancel_time_off_request'],
    approvalClass: {
      create_as_manager: 'auto_approved',
      create_as_employee: 'pending',
      approve: 'manager_required',
      reject: 'manager_required',
    },
    maturity: 'stable',
  },
  // Future entries follow same shape — audits, corrective_actions, etc.
};
```

This registry will be consumed by:
1. System prompt builder — tells the LLM what capabilities exist
2. Future: auto-generated tool definitions from registry

---

### Phase 3: Time-Off Capability Module

**`capabilities/time-off.ts`** — All domain logic for time-off, returning `CapabilityResult<T>`.

**Read capabilities:**

1. **`getTimeOffBalance(sb, employeeId, year?)`**
   - Queries `employees.annual_vacation_days` and counts approved days in year from `time_off_requests`
   - Mirrors exact calculation from `StaffTimeOff.tsx` lines 91-108
   - Returns: `{ total, used, remaining, year }`

2. **`listTimeOffRequests(sb, params: { employeeId?, companyId, status?, from?, to?, limit? })`**
   - Returns normalized list with employee name, status, dates, type, days count
   - Company-scoped via `company_id`

3. **`listPendingApprovals(sb, companyId)`**
   - Returns pending requests with employee details (name, annual_vacation_days)
   - Same query pattern as `PendingApprovalsSection.tsx` lines 65-73

4. **`checkTimeOffConflicts(sb, companyId, employeeId, startDate, endDate)`**
   - Returns overlapping approved/pending requests for the employee
   - Also returns other employees off at same location in same period (team impact)

5. **`getTeamTimeOffCalendar(sb, companyId, locationId?, from, to)`**
   - Returns who is off and when, grouped by date — useful for "who is off next Friday?"

**Action capabilities:**

6. **`createTimeOffRequest(sbService, params)`**
   - Inputs: `employeeId, startDate, endDate, requestType, reason?, companyId, actorUserId, actorRole`
   - Validates via shared validators: dates valid, no overlap, balance sufficient (if vacation)
   - Status: `approved` when actor is manager/admin/owner, `pending` when self-service
   - Returns created request

7. **`approveTimeOffRequest(sbService, requestId, actorUserId, companyId, actorRole)`**
   - Validates: request exists, is pending, belongs to company, actor has authority
   - Transitions: `pending` → `approved`, sets `approved_by`, `approved_at`

8. **`rejectTimeOffRequest(sbService, requestId, actorUserId, companyId, reason?, actorRole)`**
   - Transitions: `pending` → `rejected`, sets `rejection_reason`

9. **`cancelTimeOffRequest(sbService, requestId, actorUserId, companyId)`**
   - Validates: request is pending or approved, actor is the employee or a manager
   - Deletes the request (matching current platform behavior)

Every function:
- Checks permissions via `shared/permissions.ts`
- Validates inputs via `shared/validation.ts`
- Returns `CapabilityResult<T>`
- Logs via `shared/logging.ts`

---

### Phase 4: Wire Into Dash (index.ts changes)

**New tool definitions** (10 tools added):

Read tools:
- `get_time_off_balance` — params: `employee_name?`, `employee_id?`
- `list_time_off_requests` — params: `employee_name?`, `status?`, `from?`, `to?`
- `list_pending_time_off_approvals` — no params (company-scoped)
- `check_time_off_conflicts` — params: `employee_name`, `start_date`, `end_date`
- `get_team_time_off_calendar` — params: `location_name?`, `from`, `to`

Draft/Execute tools:
- `create_time_off_request_draft` — params: `employee_name`, `start_date`, `end_date`, `request_type`, `reason?`
- `execute_time_off_request` — params: `pending_action_id`
- `approve_time_off_request_draft` — params: `request_id` or `employee_name`
- `execute_time_off_approval` — params: `pending_action_id`
- `reject_time_off_request_dash` — params: `request_id`, `rejection_reason?`

**Tool execution routing** — Each new tool in `executeToolInner` is a thin wrapper calling the corresponding capability function from `capabilities/time-off.ts`. No inline DB queries.

**Maps updated:**
- `TOOL_MODULE_MAP`: all time-off tools → `"workforce"`
- `ACTION_EXECUTE_MAP`: `create_time_off_request` → `execute_time_off_request`, `approve_time_off_request` → `execute_time_off_approval`
- `hydrateArgsFromDraft`: new cases for `create_time_off_request` and `approve_time_off_request`
- `ACTION_RISK`: create = `medium`, approve/reject = `medium`

**System prompt update:**
- Add Time-Off to capabilities section
- Add instruction: "For vacation, time off, sick leave, personal day requests — use the time_off tools. Do NOT create shifts with role 'Vacation Day'."
- Add conversational examples from registry aliases

---

### Phase 5: Extract Tool Definitions

**`tools.ts`** — Move the 753-line tools array out of `index.ts` into its own file. This is a pure extraction — no logic changes. Reduces `index.ts` from ~2532 to ~1800 lines and makes it easier to add new tool definitions without touching orchestration code.

---

### Phase 6: Deploy & Validate

Deploy the edge function. Test the following scenarios through Dash:

1. "Show my time-off balance" → calls `get_time_off_balance`
2. "Show pending vacation requests" → calls `list_pending_time_off_approvals`
3. "Create vacation for Andrei from May 10 to May 14" → draft card with approval
4. "Approve Maria's leave request" → draft card for approval action
5. "Who is off next Friday at Moșilor?" → calls `get_team_time_off_calendar`
6. "Cancel my vacation request for next Monday" → cancel action
7. Balance validation: attempt to create vacation exceeding remaining days → validation error
8. Conflict detection: attempt overlapping requests → conflict warning

---

## What Changes vs What Stays

| Component | Status |
|-----------|--------|
| `index.ts` orchestration (LLM loop, SSE, auth) | **Stays** — no changes to core loop |
| Existing read tools (audits, CAs, attendance, etc.) | **Stays** — work as-is, migrate later |
| Existing write tools (employees, templates, shifts) | **Stays** — work as-is, migrate later |
| Draft-guard logic | **Stays** — already working |
| Direct approval path | **Updated** — new entries in maps |
| System prompt | **Updated** — Time-Off section added |
| Tool definitions | **Extracted** to `tools.ts` + new time-off tools added |

---

## Future Module Onboarding Pattern

After Time-Off, adding any domain to Dash follows this recipe:

1. Add entry to `registry.ts`
2. Create `capabilities/<domain>.ts` with reads + actions returning `CapabilityResult`
3. Add tool definitions to `tools.ts`
4. Add thin routing cases in `executeToolInner`
5. Update maps (`TOOL_MODULE_MAP`, `ACTION_EXECUTE_MAP`, etc.)
6. Update system prompt (can eventually be auto-generated from registry)

No new ad-hoc DB queries in `index.ts`. All domain logic in capability modules. All validation through shared utilities.

---

## Files Created/Modified Summary

| File | Action |
|------|--------|
| `supabase/functions/dash-command/shared/constants.ts` | **New** |
| `supabase/functions/dash-command/shared/contracts.ts` | **New** |
| `supabase/functions/dash-command/shared/permissions.ts` | **New** |
| `supabase/functions/dash-command/shared/validation.ts` | **New** |
| `supabase/functions/dash-command/shared/logging.ts` | **New** |
| `supabase/functions/dash-command/registry.ts` | **New** |
| `supabase/functions/dash-command/capabilities/time-off.ts` | **New** |
| `supabase/functions/dash-command/tools.ts` | **New** (extracted from index.ts) |
| `supabase/functions/dash-command/index.ts` | **Modified** — imports shared modules, adds time-off tool routing, updates system prompt and maps |

