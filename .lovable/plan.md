

# Fix Plan: All QA Audit Issues (5 Items)

## Overview
Five fixes addressing the "Must fix" and "Should fix" items from the audit. Three are database changes (one migration), one is a component fix, and one is a route fix.

---

## Fix 1 (P1-2): Add unique constraint on `approval_decisions`
**Migration** — prevents duplicate decisions on the same step:
```sql
ALTER TABLE public.approval_decisions 
  ADD CONSTRAINT uq_approval_decision_per_step UNIQUE (request_id, step_order);
```

## Fix 2 (P1-3 + P1-1): Create `process_approval_decision` RPC
**Same migration** — replaces the two-write client logic with a single atomic, role-checked database function:

```sql
CREATE OR REPLACE FUNCTION public.process_approval_decision(
  p_request_id uuid,
  p_step_order int,
  p_decision text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request approval_requests%ROWTYPE;
  v_total_steps int;
  v_new_status text;
  v_new_step int;
  v_user_id uuid := auth.uid();
BEGIN
  -- Fetch request + verify company
  SELECT * INTO v_request FROM approval_requests
  WHERE id = p_request_id AND company_id = get_user_company_id(v_user_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or access denied'; END IF;
  IF v_request.status != 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;
  IF v_request.current_step != p_step_order THEN RAISE EXCEPTION 'Step mismatch'; END IF;

  -- Verify caller has owner/admin/manager role
  IF NOT (
    has_company_role(v_user_id, 'company_owner') OR
    has_company_role(v_user_id, 'company_admin') OR
    has_role(v_user_id, 'manager')
  ) THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;

  -- Insert decision (unique constraint prevents duplicates)
  INSERT INTO approval_decisions (request_id, step_order, decided_by, decision, comment)
  VALUES (p_request_id, p_step_order, v_user_id, p_decision, p_comment);

  -- Calculate new status
  v_total_steps := jsonb_array_length(
    (SELECT steps FROM approval_workflows WHERE id = v_request.workflow_id)
  );
  v_new_step := p_step_order;

  IF p_decision = 'rejected' THEN
    v_new_status := 'rejected';
  ELSIF p_step_order >= v_total_steps THEN
    v_new_status := 'approved';
  ELSE
    v_new_status := 'pending';
    v_new_step := p_step_order + 1;
  END IF;

  UPDATE approval_requests
  SET status = v_new_status, current_step = v_new_step, updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('new_status', v_new_status);
END;
$$;
```

Also tighten the existing UPDATE policy on `approval_requests`:
```sql
DROP POLICY "Owners and admins can update approval requests" ON public.approval_requests;
CREATE POLICY "Owners and admins can update approval requests"
  ON public.approval_requests FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_company_role(auth.uid(), 'company_owner') 
      OR has_company_role(auth.uid(), 'company_admin')
      OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_company_role(auth.uid(), 'company_owner') 
      OR has_company_role(auth.uid(), 'company_admin')
      OR has_role(auth.uid(), 'manager'))
  );
```

## Fix 3: Refactor `useApproveOrReject` to use the RPC
**File**: `src/hooks/useApprovals.ts` (lines 236-300)

Replace the two separate Supabase calls with a single `supabase.rpc('process_approval_decision', {...})` call. Remove `total_steps` from the input interface since the RPC calculates it server-side.

## Fix 4 (P2-1): Fix `PendingApprovalsWidget` total_steps
**File**: `src/components/dashboard/PendingApprovalsWidget.tsx` (line 18-29)

After the RPC refactor, `total_steps` is no longer needed client-side. The `handleDecision` call simplifies to just `request_id`, `step_order`, `decision`. No more hardcoded `99`.

## Fix 5 (P2-2): Wrap `/approvals` route in ModuleGate
**File**: `src/App.tsx` (line 326)

Change from:
```tsx
<Route path="/approvals" element={<ProtectedRoute><ApprovalQueue /></ProtectedRoute>} />
```
To:
```tsx
<Route path="/approvals" element={<ProtectedRoute><ModuleGate module="government_ops"><ApprovalQueue /></ModuleGate></ProtectedRoute>} />
```

---

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Unique constraint + RPC + tightened RLS policy |
| `src/hooks/useApprovals.ts` | Refactor `useApproveOrReject` to use RPC, remove `total_steps` param |
| `src/components/dashboard/PendingApprovalsWidget.tsx` | Remove `total_steps: 99`, simplify call |
| `src/pages/ApprovalQueue.tsx` | Remove `total_steps` calculation, simplify call |
| `src/App.tsx` | Add `ModuleGate` wrapper on `/approvals` route |

