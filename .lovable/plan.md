

# Fix All QA Issues — P0, P1 & P2

## Issues to Fix

**P0-1**: `reassign_corrective_action` executes immediately, bypassing approval gate
**P0-2**: `execute_shift_creation` has no implementation in executeTool switch
**P1-3**: `dash_org_memory.memory_type` CHECK constraint mismatch with tool values
**P1-4**: `dash_saved_workflows` missing `is_shared` column
**P2-5**: `dash_saved_workflows` missing SELECT policy for shared workflows
**P2-6**: `DashPanel` accessible to staff roles (no role guard)

---

## Step 1 — Fix P0-1: CA Reassignment Approval Gate

**File**: `supabase/functions/dash-command/index.ts` (lines 1220-1306)

Replace the current `reassign_corrective_action` case so it ONLY creates a pending action and returns an `action_preview` card — NO immediate UPDATE. Then add a new `execute_ca_reassignment` case (after line 1218) that:
1. Validates pending action exists, is `pending`, and belongs to same company
2. Executes the UPDATE on `corrective_actions`
3. Updates pending action status
4. Logs to `dash_action_log`
5. Pushes `execution_result` structured event

Also register `execute_ca_reassignment` in `TOOL_MODULE_MAP` (line 26) and `ACTION_RISK` (line 42).

---

## Step 2 — Fix P0-2: Add `execute_shift_creation` Handler

**File**: `supabase/functions/dash-command/index.ts` (before line 1220, after the audit template case)

Add `case "execute_shift_creation"` following the same pattern as `execute_employee_creation`:
1. Validate pending action (status, company)
2. Read draft from `preview_json`
3. Insert into `shifts` table with `sbService`
4. Update pending action status
5. Log to `dash_action_log`
6. Push `execution_result` event

---

## Step 3 — Fix P1-3 & P1-4: Database Schema Fixes

**Database migration** with:

```sql
-- P1-3: Fix memory_type CHECK to include both old and new enum values
ALTER TABLE public.dash_org_memory DROP CONSTRAINT IF EXISTS dash_org_memory_memory_type_check;
ALTER TABLE public.dash_org_memory ADD CONSTRAINT dash_org_memory_memory_type_check 
  CHECK (memory_type IN ('vocabulary','process','convention','shortcut','terminology','standard','note'));

-- P1-4: Add is_shared column
ALTER TABLE public.dash_saved_workflows 
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;
```

---

## Step 4 — Fix P2-5: Shared Workflows SELECT Policy

Same migration as Step 3:

```sql
CREATE POLICY "Company members can view shared workflows" 
  ON public.dash_saved_workflows FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND is_shared = true);
```

---

## Step 5 — Fix P2-6: DashPanel Role Guard

**File**: `src/components/dash/DashPanel.tsx` (line 41-49)

Add early return after roleData check:
```typescript
if (!roleData?.isAdmin && !roleData?.isManager) return null;
```

This prevents staff from accessing the Dash sidebar panel.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Fix CA reassignment (draft-only), add `execute_ca_reassignment`, add `execute_shift_creation` |
| `src/components/dash/DashPanel.tsx` | Add role guard |
| Database migration | Fix CHECK constraint, add `is_shared` column, add shared workflows SELECT policy |

## Delivery Order
1. Database migration (schema fixes — P1-3, P1-4, P2-5)
2. Edge function fixes (P0-1, P0-2)
3. DashPanel role guard (P2-6)

