
-- Fix P1-2: Unique constraint to prevent duplicate decisions
ALTER TABLE public.approval_decisions 
  ADD CONSTRAINT uq_approval_decision_per_step UNIQUE (request_id, step_order);

-- Fix P1-1 + P1-3: Atomic RPC for approval decisions with role checks
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

  -- Calculate new status from workflow steps
  v_total_steps := jsonb_array_length(
    (SELECT steps::jsonb FROM approval_workflows WHERE id = v_request.workflow_id)
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

-- Fix P1-3: Tighten UPDATE policy on approval_requests
DROP POLICY IF EXISTS "Owners and admins can update approval requests" ON public.approval_requests;
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
