

# Fix: Dash-Created Shifts Not Appearing in Grid — End-to-End

## Root Causes (3 issues)

### Issue 1 — Shift created as unpublished (CRITICAL)
The `execute_shift_creation` handler does NOT set `is_published`. The `shifts` table defaults `is_published` to `false`. The scheduling grid (`EnhancedShiftWeekView`, line 477) filters: `if (!shift.is_published) return false` — so unpublished shifts are invisible in the Location view.

**Fix**: Set `is_published: true` in the shift INSERT inside `execute_shift_creation`.

### Issue 2 — No shift_assignment created (CRITICAL for Employee view)
When a user says "add Alex to the schedule," the employee identity is lost because `create_shift_draft` has no `employee_name`/`employee_id` parameter. Even if the shift were published, it would show as "Unassigned" in the Location view and would be completely invisible in the Employee view (which only shows shifts with `shift_assignments` matching `staff_id`).

**Fix (3 parts)**:
1. Add `employee_name` and `employee_id` as optional params to `create_shift_draft` tool definition
2. In the `create_shift_draft` handler, resolve `employee_name` → `employee_id` via the `employees` table and include both in `preview_json`
3. In `execute_shift_creation`, after inserting the shift, if `draft.employee_id` exists, insert a `shift_assignment` row with `approval_status: 'approved'`

### Issue 3 — `staff_needed` vs `required_count` mismatch (MINOR, UI)
Line 1349 of `EnhancedShiftWeekView.tsx` references `shift.staff_needed` which doesn't exist on the table — the column is `required_count`. This causes the badge to always show `/1` regardless of actual value. This is a pre-existing UI bug, not caused by the Dash fix, but worth correcting.

**Fix**: Change `shift.staff_needed` → `shift.required_count` on line 1349.

---

## Detailed Changes

### File 1: `supabase/functions/dash-command/index.ts`

**A) Update `create_shift_draft` tool definition (around line 470)**
Add two optional parameters:
```typescript
employee_name: { type: "string", description: "Name of employee to assign to this shift" },
employee_id: { type: "string", description: "Employee ID to assign" },
```

**B) Update `create_shift_draft` handler (around line 994)**
After location resolution, add employee resolution:
- If `employee_name` provided but no `employee_id`, query `employees` table by name within company
- Store `employee_id` and `employee_name` in the draft object and `preview_json`

**C) Update `execute_shift_creation` handler (around line 1403)**
1. Add `is_published: true` to the shift INSERT
2. After successful shift insert, if `draft.employee_id` exists:
   ```typescript
   await sbService.from("shift_assignments").insert({
     shift_id: shiftData.id,
     staff_id: draft.employee_id,
     approval_status: "approved",
   });
   ```
3. Include employee info in the success response and structured event

**D) Update system prompt (around line 1702)**
Add note that when user mentions a specific person, the LLM should include `employee_name` in the `create_shift_draft` call.

### File 2: `src/components/workforce/EnhancedShiftWeekView.tsx`

**Line 1349**: Change `shift.staff_needed || 1` → `shift.required_count || 1`

---

## End-to-End Flow After Fix

```text
User: "Add Alex Grecea to Amzei schedule tomorrow, Chef, 09:00-17:00"
  → LLM calls create_shift_draft(role="Chef", location_name="Amzei",
      employee_name="Alex Grecea", shift_date="2026-03-24", ...)
  → Handler resolves location + employee by name
  → Draft stored in dash_pending_actions with employee_id in preview_json
  → Action preview card shown to user
  → User says "yes"
  → LLM calls execute_shift_creation(pending_action_id=...)
  → Handler:
    1. INSERT into shifts (is_published: true) → shift_id
    2. INSERT into shift_assignments (shift_id, staff_id, approved)
    3. Mark pending action as executed
    4. Log to dash_action_log
  → Shift appears in grid under Alex's row AND in Location view
  → Realtime subscription triggers refresh for other users
```

## Edge Cases Covered

- **No employee mentioned**: Shift created as unassigned, visible in Location view with "Unassigned" label
- **Employee name not found**: Draft returns error with missing_fields including employee
- **Employee already has shift at same time**: Shift still created (conflict detection is handled by the UI dialog, not Dash — consistent with existing behavior)
- **Staff view**: Employee sees the shift on their StaffHome page via `shift_assignments` query

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Add employee params, resolve employee, set is_published, create shift_assignment |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Fix `staff_needed` → `required_count` |

