-- Fix shift start time calculation to use company timezone properly
-- The bug: combining date + time was producing UTC timestamp instead of local time

CREATE OR REPLACE FUNCTION public.complete_task_guarded(
  p_task_id UUID,
  p_occurrence_date DATE,
  p_completed_at TIMESTAMPTZ DEFAULT now(),
  p_completion_reason TEXT DEFAULT NULL,
  p_completion_photo_url TEXT DEFAULT NULL,
  p_override_reason TEXT DEFAULT NULL,
  p_is_manager_override BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_employee RECORD;
  v_unlock_at TIMESTAMPTZ;
  v_occurrence_start TIMESTAMPTZ;
  v_completion_mode TEXT;
  v_deadline TIMESTAMPTZ;
  v_is_individual BOOLEAN;
  v_existing_completion UUID;
  v_company_tz TEXT := 'Europe/Bucharest'; -- Company timezone
  v_unlock_before_minutes INT;
  v_lock_mode TEXT;
  v_allow_early BOOLEAN;
  v_shift_start_ts TIMESTAMPTZ;
BEGIN
  -- 1. Get the calling user's employee record
  SELECT e.id, e.company_id, e.location_id, e.role
  INTO v_employee
  FROM employees e
  WHERE e.user_id = auth.uid();
  
  IF v_employee.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'No employee record found for current user'
    );
  END IF;
  
  -- 2. Get the task
  SELECT 
    t.*,
    COALESCE(t.lock_mode, 'scheduled') as effective_lock_mode,
    COALESCE(t.unlock_before_minutes, 30) as effective_unlock_before,
    COALESCE(t.allow_early_completion, false) as effective_allow_early,
    COALESCE(t.is_individual, false) as is_individual_task
  INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id;
  
  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TASK_NOT_FOUND',
      'message', 'Task not found'
    );
  END IF;
  
  -- 3. Verify employee belongs to same company
  IF v_employee.company_id != v_task.company_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You are not authorized to complete tasks for this company'
    );
  END IF;
  
  -- 4. Check authorization: employee must be assigned or match role
  IF v_task.assigned_to IS NOT NULL AND v_task.assigned_to != v_employee.id THEN
    -- Task is directly assigned to someone else
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_ASSIGNED',
      'message', 'This task is assigned to another employee'
    );
  END IF;
  
  -- 5. Block completion before shift start time (unless manager override)
  IF NOT p_is_manager_override THEN
    -- Find earliest approved/confirmed shift for this employee on occurrence_date
    -- FIX: Use timezone conversion to get correct local time
    SELECT timezone(v_company_tz, (p_occurrence_date || ' ' || s.start_time::TEXT)::TIMESTAMP)
    INTO v_shift_start_ts
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    WHERE sa.staff_id = v_employee.id
      AND s.shift_date = p_occurrence_date
      AND sa.approval_status IN ('approved', 'confirmed')
    ORDER BY s.start_time ASC
    LIMIT 1;
    
    IF v_shift_start_ts IS NOT NULL AND p_completed_at < v_shift_start_ts THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'BEFORE_SHIFT_START',
        'shift_start_at', v_shift_start_ts,
        'shift_start_at_formatted', to_char(v_shift_start_ts AT TIME ZONE v_company_tz, 'HH24:MI'),
        'message', 'You cannot complete tasks before your shift starts at ' || to_char(v_shift_start_ts AT TIME ZONE v_company_tz, 'HH24:MI')
      );
    END IF;
  END IF;
  
  -- 6. Compute occurrence start time (task start_at time-of-day applied to occurrence_date)
  IF v_task.start_at IS NOT NULL THEN
    -- FIX: Use timezone conversion to get correct local time
    v_occurrence_start := timezone(v_company_tz, 
      (p_occurrence_date || ' ' || to_char(v_task.start_at AT TIME ZONE v_company_tz, 'HH24:MI:SS'))::TIMESTAMP);
  ELSE
    v_occurrence_start := NULL;
  END IF;
  
  -- 7. Time-lock validation (skip for manager override or anytime mode)
  v_lock_mode := v_task.effective_lock_mode;
  v_unlock_before_minutes := v_task.effective_unlock_before;
  v_allow_early := v_task.effective_allow_early;
  
  IF NOT p_is_manager_override AND v_lock_mode = 'scheduled' AND v_occurrence_start IS NOT NULL THEN
    v_unlock_at := v_occurrence_start - (v_unlock_before_minutes || ' minutes')::INTERVAL;
    
    IF p_completed_at < v_unlock_at AND NOT v_allow_early THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'TASK_LOCKED_UNTIL',
        'unlock_at', v_unlock_at,
        'unlock_at_formatted', to_char(v_unlock_at AT TIME ZONE v_company_tz, 'HH24:MI'),
        'message', 'Task is locked until ' || to_char(v_unlock_at AT TIME ZONE v_company_tz, 'HH24:MI')
      );
    END IF;
  END IF;
  
  -- 8. Determine completion mode
  IF v_occurrence_start IS NOT NULL THEN
    v_deadline := v_occurrence_start + (COALESCE(v_task.duration_minutes, 0) || ' minutes')::INTERVAL;
    
    IF v_unlock_at IS NOT NULL AND p_completed_at < v_unlock_at THEN
      v_completion_mode := 'early';
    ELSIF v_task.duration_minutes IS NOT NULL AND p_completed_at > v_deadline THEN
      v_completion_mode := 'late';
    ELSE
      v_completion_mode := 'on_time';
    END IF;
  ELSE
    v_completion_mode := 'on_time';
  END IF;
  
  -- For manager override completions, mark as such
  IF p_is_manager_override THEN
    v_completion_mode := 'override';
  END IF;
  
  -- 9. Check for existing completion (per-occurrence deduplication)
  SELECT id INTO v_existing_completion
  FROM task_completions
  WHERE task_id = p_task_id
    AND occurrence_date = p_occurrence_date;
  
  IF v_existing_completion IS NOT NULL THEN
    -- Idempotent: return success for already completed
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'completion_id', v_existing_completion,
      'message', 'Task was already completed for this occurrence'
    );
  END IF;
  
  -- 10. Record the completion in task_completions
  -- CRITICAL: Always record completed_by_employee_id for Champions attribution
  INSERT INTO task_completions (
    task_id,
    occurrence_date,
    completed_at,
    completed_by_employee_id,
    completion_mode,
    completion_reason,
    completion_photo_url,
    overridden_by_user_id,
    overridden_reason
  ) VALUES (
    p_task_id,
    p_occurrence_date,
    p_completed_at,
    v_employee.id,
    v_completion_mode,
    p_completion_reason,
    p_completion_photo_url,
    CASE WHEN p_is_manager_override THEN auth.uid() ELSE NULL END,
    CASE WHEN p_is_manager_override THEN p_override_reason ELSE NULL END
  )
  RETURNING id INTO v_existing_completion;
  
  RETURN jsonb_build_object(
    'success', true,
    'completion_id', v_existing_completion,
    'task_id', p_task_id,
    'occurrence_date', p_occurrence_date,
    'completed_at', p_completed_at,
    'completed_by_employee_id', v_employee.id,
    'completion_mode', v_completion_mode,
    'status', 'completed'
  );
END;
$$;