
-- Create a security definer function to reject shift assignments
-- This bypasses RLS and checks permissions within the function
CREATE OR REPLACE FUNCTION reject_shift_assignment(assignment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_is_manager boolean;
  v_is_admin boolean;
  v_shift_company_id uuid;
  v_deleted_count int;
  v_assignment_data json;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's company and roles
  v_company_id := get_user_company_id(v_user_id);
  v_is_manager := has_role(v_user_id, 'manager'::app_role);
  v_is_admin := has_role(v_user_id, 'admin'::app_role);
  
  -- Get the shift's company
  SELECT s.company_id INTO v_shift_company_id
  FROM shift_assignments sa
  JOIN shifts s ON sa.shift_id = s.id
  WHERE sa.id = assignment_id;
  
  -- Check if assignment exists
  IF v_shift_company_id IS NULL THEN
    RAISE EXCEPTION 'Shift assignment not found';
  END IF;
  
  -- Check permissions
  IF v_company_id != v_shift_company_id THEN
    RAISE EXCEPTION 'You do not have permission to reject this shift assignment';
  END IF;
  
  IF NOT (v_is_manager OR v_is_admin) THEN
    RAISE EXCEPTION 'You must be a manager or admin to reject shift assignments';
  END IF;
  
  -- Get assignment data before deletion for return value
  SELECT json_build_object(
    'id', sa.id,
    'staff_id', sa.staff_id,
    'shift_id', sa.shift_id,
    'employee_name', e.full_name,
    'shift_date', s.shift_date,
    'start_time', s.start_time,
    'end_time', s.end_time,
    'role', s.role,
    'location_name', l.name,
    'company_id', e.company_id
  ) INTO v_assignment_data
  FROM shift_assignments sa
  JOIN employees e ON sa.staff_id = e.id
  JOIN shifts s ON sa.shift_id = s.id
  JOIN locations l ON s.location_id = l.id
  WHERE sa.id = assignment_id;
  
  -- Delete the assignment
  DELETE FROM shift_assignments
  WHERE id = assignment_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Failed to delete shift assignment';
  END IF;
  
  RETURN v_assignment_data;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reject_shift_assignment(uuid) TO authenticated;

-- Create a security definer function to approve shift assignments  
CREATE OR REPLACE FUNCTION approve_shift_assignment(assignment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_is_manager boolean;
  v_is_admin boolean;
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
  
  -- Get user's company and roles
  v_company_id := get_user_company_id(v_user_id);
  v_is_manager := has_role(v_user_id, 'manager'::app_role);
  v_is_admin := has_role(v_user_id, 'admin'::app_role);
  
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
  IF v_company_id != v_shift_company_id THEN
    RAISE EXCEPTION 'You do not have permission to approve this shift assignment';
  END IF;
  
  IF NOT (v_is_manager OR v_is_admin) THEN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_shift_assignment(uuid) TO authenticated;
