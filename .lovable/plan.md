

# Fix 3 Broken Capabilities + Full Platform Expansion Roadmap

## Verified Data Accuracy

I cross-checked every screenshot against live database queries:

| Screenshot | Dash Output | DB Truth | Verdict |
|-----------|-------------|----------|---------|
| "Biggest issues last 30 days" | 21 late, 10 missing checkouts, 97% avg, 108/119 scored | 21 late, 10 missing, 97% avg, 108/120 scored | CORRECT |
| "Compare audits this month" | LBFC Mosilor 100%, LBFC Obor 100%, Amzei 96%, etc. | Matches exactly | CORRECT |
| "Weekly compliance" | 27 audits, 20 finished, 94%, 48 logs, 1 late, 5 missing | Matches exactly (Mar 17-24) | CORRECT |
| "Open corrective actions" | ERROR: `assigned_to` column | Column is `owner_user_id` | BUG |
| "Training overdue" | ERROR fetching | Wrong columns: `employee_id`, `training_module_id`, `due_date` | BUG |
| "Attendance this week" | "Please specify dates" | No date auto-resolution in prompt | BUG |
| "Change status / remove from schedule" | "I cannot" | No update/delete tools exist | MISSING CAPABILITY |

Reads are accurate. Three tools are broken. Write capabilities are limited to create-only.

---

## Phase A — Fix 3 Broken Tools (immediate)

### Fix 1: `corrective-actions.ts` — replace `assigned_to` with `owner_user_id`

5 changes across the file:
- Line 17: select `owner_user_id` instead of `assigned_to`
- Line 25: map output key `assigned_to: ca.owner_user_id`
- Line 40: select `owner_user_id` instead of `assigned_to`
- Line 65: `old_assigned_to: caData.owner_user_id`
- Line 119: `.update({ owner_user_id: preview.new_assigned_to })`

### Fix 2: `operations.ts` — fix `getTrainingGaps` column names

Line 51-57: Replace query with correct schema:
- `employee_id` → `trainee_employee_id`
- `training_module_id, training_modules(title)` → `module_id, training_programs(name)`
- `due_date` → `start_date`
- Fix all downstream references in the map function

### Fix 3: System prompt — add date auto-resolution rule

Add to `buildSystemPrompt()` after the Today/Timezone context (around line 677):

```
- **CRITICAL DATE RULE**: When the user says "this week", "last week", "this month", "last 30 days", "today", "yesterday", or ANY relative date expression, you MUST auto-resolve it to concrete YYYY-MM-DD dates using the Today value above. NEVER ask the user to specify dates. Examples: "this week" = Monday of current week to today. "last 30 days" = today minus 30 to today. "last month" = first to last day of previous month.
```

---

## Phase B — Full Platform Expansion (approval-gated)

These are the missing write capabilities that prevent Dash from being the true operational brain. Each follows the existing Draft → Approval → Execute pattern.

### B1: Schedule Management (shifts)
- `update_shift_draft` — change time, role, date, or assigned employee
- `delete_shift_draft` — remove a shift (with assignment cleanup)
- `swap_shift_draft` — swap two employees between shifts

### B2: Corrective Action Lifecycle
- `update_ca_status_draft` — move CA to in_progress, done, verified, closed
- `close_corrective_action_draft` — close with verification check
- `create_corrective_action_draft` — create new CA from Dash

### B3: Employee Management
- `update_employee_draft` — change role, location, status, contact info
- `deactivate_employee_draft` — soft-deactivate with cascade checks

### B4: Attendance Management
- `correct_attendance_draft` — fix missed checkout, adjust clock-in time
- `excuse_late_arrival_draft` — mark a late arrival as excused

### B5: Work Order Management
- `create_work_order_draft` — create new CMMS work order
- `update_work_order_status_draft` — change status (open → in_progress → completed)
- `assign_work_order_draft` — assign to employee

### B6: Task Management
- `assign_task_draft` — assign task to employee/location
- `create_task_draft` — create ad-hoc task

### B7: Training Management
- `create_training_assignment_draft` — assign training to employee
- `update_training_status_draft` — mark training complete/failed

Each new tool requires:
1. Tool definition in `tools.ts`
2. Capability function in appropriate module
3. Registry entry update
4. Routing in `executeToolInner`
5. `ACTION_EXECUTE_MAP` entry for server-authoritative approval
6. `hydrateArgsFromDraft` case for the action

---

## Implementation Order

1. **Phase A** (this session): Fix 3 broken tools — corrective actions, training, date resolution
2. **Phase B1** (next): Schedule management (most requested per screenshots)
3. **Phase B2-B7** (subsequent): One phase per session, each adding 2-3 tools

---

## Files Modified (Phase A only)

| File | Change |
|------|--------|
| `capabilities/corrective-actions.ts` | Replace all `assigned_to` → `owner_user_id` |
| `capabilities/operations.ts` | Fix `getTrainingGaps` column names to match schema |
| `index.ts` | Add date auto-resolution rule to system prompt |

