-- Drop and recreate the approve_shift_assignment function to also check if user is a manager via employees table
CREATE OR REPLACE FUNCTION public.approve_shift_assignment(assignment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_user_company_role text;
  v_is_manager_employee boolean;
  v_shift_company_id uuid;
  v_staff_id uuid;
  v_shift_date date;
  v_start_time time;
  v_end_time time;
  v_conflicting_count int;
  v_result json;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's company and role from company_users
  SELECT cu.company_id, cu.company_role INTO v_company_id, v_user_company_role
  FROM company_users cu
  WHERE cu.user_id = v_user_id;
  
  -- Check if user is a manager via employees table
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = v_user_id
    AND LOWER(e.role) IN ('manager', 'supervisor', 'lead', 'team lead')
  ) INTO v_is_manager_employee;
  
  -- Get the shift details
  SELECT s.company_id, sa.staff_id, s.shift_date, s.start_time, s.end_time
  INTO v_shift_company_id, v_staff_id, v_shift_date, v_start_time, v_end_time
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.id = assignment_id;
  
  -- Check if assignment exists
  IF v_shift_company_id IS NULL THEN
    RAISE EXCEPTION 'Shift assignment not found';
  END IF;
  
  -- Check permissions
  IF v_company_id IS NOT NULL AND v_company_id != v_shift_company_id THEN
    RAISE EXCEPTION 'You do not have permission to approve this shift assignment';
  END IF;
  
  -- Check if user is manager or admin (company_admin, company_owner, or manager employee)
  IF v_user_company_role NOT IN ('company_admin', 'company_owner') AND NOT v_is_manager_employee THEN
    RAISE EXCEPTION 'You must be a manager or admin to approve shift assignments';
  END IF;
  
  -- Check for conflicting approved shifts
  SELECT COUNT(*) INTO v_conflicting_count
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.staff_id = v_staff_id
    AND sa.id != assignment_id
    AND sa.approval_status = 'approved'
    AND s.shift_date = v_shift_date
    AND (
      (v_start_time >= s.start_time AND v_start_time < s.end_time) OR
      (v_end_time > s.start_time AND v_end_time <= s.end_time) OR
      (v_start_time <= s.start_time AND v_end_time >= s.end_time)
    );
  
  IF v_conflicting_count > 0 THEN
    -- Delete the conflicting assignment
    DELETE FROM shift_assignments WHERE id = assignment_id;
    
    RETURN json_build_object(
      'status', 'rejected_conflict',
      'message', 'Employee already has an approved shift at this time'
    );
  END IF;
  
  -- Approve the assignment
  UPDATE shift_assignments
  SET 
    approval_status = 'approved',
    approved_by = v_user_id,
    approved_at = now()
  WHERE id = assignment_id;
  
  RETURN json_build_object(
    'status', 'approved',
    'message', 'Shift assignment approved'
  );
END;
$$;

-- Also update reject_shift_assignment function
CREATE OR REPLACE FUNCTION public.reject_shift_assignment(assignment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_user_company_role text;
  v_is_manager_employee boolean;
  v_shift_company_id uuid;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's company and role from company_users
  SELECT cu.company_id, cu.company_role INTO v_company_id, v_user_company_role
  FROM company_users cu
  WHERE cu.user_id = v_user_id;
  
  -- Check if user is a manager via employees table
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = v_user_id
    AND LOWER(e.role) IN ('manager', 'supervisor', 'lead', 'team lead')
  ) INTO v_is_manager_employee;
  
  -- Get the shift's company_id
  SELECT s.company_id INTO v_shift_company_id
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.id = assignment_id;
  
  -- Check if assignment exists
  IF v_shift_company_id IS NULL THEN
    RAISE EXCEPTION 'Shift assignment not found';
  END IF;
  
  -- Check permissions
  IF v_company_id IS NOT NULL AND v_company_id != v_shift_company_id THEN
    RAISE EXCEPTION 'You do not have permission to reject this shift assignment';
  END IF;
  
  -- Check if user is manager or admin (company_admin, company_owner, or manager employee)
  IF v_user_company_role NOT IN ('company_admin', 'company_owner') AND NOT v_is_manager_employee THEN
    RAISE EXCEPTION 'You must be a manager or admin to reject shift assignments';
  END IF;
  
  -- Delete the assignment
  DELETE FROM shift_assignments WHERE id = assignment_id;
  
  RETURN json_build_object(
    'status', 'rejected',
    'message', 'Shift assignment rejected'
  );
END;
$$;