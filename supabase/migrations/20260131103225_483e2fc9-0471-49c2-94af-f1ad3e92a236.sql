-- Fix timezone handling in find_scheduled_shift_for_clockin RPC
-- Add helper to get company timezone, update RPC to use it

-- 1. Create helper function to get company timezone with fallback
CREATE OR REPLACE FUNCTION public.get_company_timezone(p_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Currently companies table doesn't have timezone column
  -- Return default Romania timezone - can be extended later
  SELECT COALESCE(
    (SELECT 'Europe/Bucharest' FROM public.companies WHERE id = p_company_id),
    'Europe/Bucharest'
  );
$$;

-- 2. Update find_scheduled_shift_for_clockin to accept company_id and use dynamic timezone
CREATE OR REPLACE FUNCTION public.find_scheduled_shift_for_clockin(
  p_company_id uuid,
  p_employee_id uuid,
  p_location_id uuid,
  p_check_time timestamptz,
  p_grace_minutes integer DEFAULT 60
)
RETURNS TABLE(
  shift_id uuid,
  shift_date date,
  start_time time,
  end_time time,
  is_late boolean,
  late_minutes integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text;
  v_check_date date;
  v_check_time time;
BEGIN
  -- Get company timezone
  v_timezone := public.get_company_timezone(p_company_id);
  
  v_check_date := (p_check_time AT TIME ZONE v_timezone)::date;
  v_check_time := (p_check_time AT TIME ZONE v_timezone)::time;
  
  RETURN QUERY
  SELECT 
    s.id AS shift_id,
    s.shift_date,
    s.start_time,
    s.end_time,
    (v_check_time > (s.start_time + (p_grace_minutes || ' minutes')::interval)) AS is_late,
    GREATEST(0, EXTRACT(EPOCH FROM (v_check_time - s.start_time)) / 60)::integer AS late_minutes
  FROM public.shifts s
  INNER JOIN public.shift_assignments sa ON sa.shift_id = s.id
  WHERE s.company_id = p_company_id
    AND sa.staff_id = p_employee_id
    AND sa.approval_status = 'approved'
    AND s.location_id = p_location_id
    AND s.shift_date = v_check_date
    AND COALESCE(s.status, 'active') NOT IN ('cancelled', 'deleted')
    -- Within grace window: check_time should be within [start - grace, end + grace]
    AND v_check_time >= (s.start_time - (p_grace_minutes || ' minutes')::interval)
    AND v_check_time <= (s.end_time + (p_grace_minutes || ' minutes')::interval)
  ORDER BY ABS(EXTRACT(EPOCH FROM (v_check_time - s.start_time)))
  LIMIT 1;
END;
$$;

-- 3. Update apply_schedule_change_request to be more robust with soft delete
-- Also add authorization check
CREATE OR REPLACE FUNCTION public.apply_schedule_change_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.schedule_change_requests;
  v_user_id uuid;
  v_result jsonb;
  v_new_shift_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get and lock the request
  SELECT * INTO v_request
  FROM public.schedule_change_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Check user has permission (is a manager/admin in the company)
  SELECT EXISTS(
    SELECT 1 FROM public.company_users cu
    LEFT JOIN public.user_roles ur ON ur.user_id = cu.user_id
    WHERE cu.user_id = v_user_id 
      AND cu.company_id = v_request.company_id
      AND (
        cu.company_role IN ('company_owner', 'company_admin')
        OR ur.role IN ('admin', 'manager')
      )
  ) INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to approve change requests');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Apply the change based on type
  CASE v_request.change_type
    WHEN 'add' THEN
      -- Insert new shift from payload_after
      INSERT INTO public.shifts (
        company_id, location_id, shift_date, start_time, end_time, role,
        required_count, notes, created_by, is_published, is_open_shift,
        close_duty, break_duration_minutes, shift_type
      )
      SELECT
        v_request.company_id,
        v_request.location_id,
        (v_request.payload_after->>'shift_date')::date,
        (v_request.payload_after->>'start_time')::time,
        (v_request.payload_after->>'end_time')::time,
        v_request.payload_after->>'role',
        COALESCE((v_request.payload_after->>'required_count')::int, 1),
        v_request.payload_after->>'notes',
        v_user_id,
        true,
        COALESCE((v_request.payload_after->>'is_open_shift')::boolean, false),
        COALESCE((v_request.payload_after->>'close_duty')::boolean, false),
        COALESCE((v_request.payload_after->>'break_duration_minutes')::int, 0),
        COALESCE(v_request.payload_after->>'shift_type', 'regular')
      RETURNING id INTO v_new_shift_id;
      
      v_result := jsonb_build_object('shift_id', v_new_shift_id);
      
    WHEN 'edit' THEN
      -- Update existing shift from payload_after
      UPDATE public.shifts
      SET
        start_time = COALESCE((v_request.payload_after->>'start_time')::time, start_time),
        end_time = COALESCE((v_request.payload_after->>'end_time')::time, end_time),
        role = COALESCE(v_request.payload_after->>'role', role),
        required_count = COALESCE((v_request.payload_after->>'required_count')::int, required_count),
        notes = COALESCE(v_request.payload_after->>'notes', notes),
        is_open_shift = COALESCE((v_request.payload_after->>'is_open_shift')::boolean, is_open_shift),
        close_duty = COALESCE((v_request.payload_after->>'close_duty')::boolean, close_duty),
        break_duration_minutes = COALESCE((v_request.payload_after->>'break_duration_minutes')::int, break_duration_minutes),
        updated_at = now()
      WHERE id = v_request.target_shift_id;
      
      v_result := jsonb_build_object('shift_id', v_request.target_shift_id);
      
    WHEN 'delete' THEN
      -- Soft delete: update status and set cancelled_at
      UPDATE public.shifts
      SET 
        status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
      WHERE id = v_request.target_shift_id;
      
      v_result := jsonb_build_object('shift_id', v_request.target_shift_id);
  END CASE;
  
  -- Mark request as approved
  UPDATE public.schedule_change_requests
  SET 
    status = 'approved',
    approved_by = v_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object('success', true, 'result', v_result);
END;
$$;

-- 4. Create a function to create workforce exception (used by attendance flow)
CREATE OR REPLACE FUNCTION public.create_workforce_exception(
  p_company_id uuid,
  p_location_id uuid,
  p_employee_id uuid,
  p_exception_type text,
  p_shift_id uuid DEFAULT NULL,
  p_attendance_id uuid DEFAULT NULL,
  p_shift_date date DEFAULT NULL,
  p_reason_code text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exception_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO public.workforce_exceptions (
    company_id, location_id, employee_id, exception_type, status,
    shift_id, attendance_id, shift_date, reason_code, note,
    requested_by, metadata
  ) VALUES (
    p_company_id, p_location_id, p_employee_id, p_exception_type, 'pending',
    p_shift_id, p_attendance_id, COALESCE(p_shift_date, CURRENT_DATE),
    p_reason_code, p_note, v_user_id, p_metadata
  )
  RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;