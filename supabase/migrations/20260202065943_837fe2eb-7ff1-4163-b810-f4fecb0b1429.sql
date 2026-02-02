-- Add time-lock fields to tasks table for completion window control
-- These fields control when staff can complete tasks relative to their scheduled time

-- Add lock_mode: determines completion timing behavior
-- 'anytime' = can complete anytime (default for backward compat)
-- 'scheduled' = can only complete within unlock window
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS lock_mode TEXT NOT NULL DEFAULT 'anytime';

-- Add unlock_before_minutes: how many minutes before start_at the task becomes completable
-- Default 30 = task unlocks 30 minutes before scheduled time
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS unlock_before_minutes INTEGER NOT NULL DEFAULT 30;

-- Add allow_early_completion: if true, allow completion before unlock time with reason/photo
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS allow_early_completion BOOLEAN NOT NULL DEFAULT false;

-- Add early_requires_reason: if allow_early_completion, whether reason text is required
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS early_requires_reason BOOLEAN NOT NULL DEFAULT false;

-- Add early_requires_photo: if allow_early_completion, whether photo is required  
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS early_requires_photo BOOLEAN NOT NULL DEFAULT false;

-- Add completion_mode to track how task was completed
-- 'on_time' = completed within normal window
-- 'early' = completed before unlock time (with reason if required)
-- 'late' = completed after deadline
-- 'override' = manager override
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completion_mode TEXT NULL;

-- Add completion_reason for early completions or overrides
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completion_reason TEXT NULL;

-- Add completion_photo_url for early completions requiring photo
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completion_photo_url TEXT NULL;

-- Add override fields for manager overrides
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS overridden_by UUID NULL REFERENCES auth.users(id);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS overridden_reason TEXT NULL;

-- Create the guarded task completion RPC
-- This enforces time-lock rules server-side
CREATE OR REPLACE FUNCTION public.complete_task_guarded(
  p_task_id UUID,
  p_occurrence_date DATE DEFAULT CURRENT_DATE,
  p_completed_at TIMESTAMPTZ DEFAULT NOW(),
  p_reason TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_override BOOLEAN DEFAULT FALSE,
  p_override_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_employee_id UUID;
  v_user_id UUID;
  v_is_manager BOOLEAN;
  v_scheduled_at TIMESTAMPTZ;
  v_unlock_at TIMESTAMPTZ;
  v_deadline TIMESTAMPTZ;
  v_completion_mode TEXT;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  
  -- Get employee record
  SELECT id INTO v_employee_id
  FROM employees
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Get task with all fields
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;
  
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;
  
  -- Check if user is manager (in company_users with admin/manager role)
  SELECT EXISTS(
    SELECT 1 FROM company_users 
    WHERE user_id = v_user_id 
    AND company_id = v_task.company_id
    AND role IN ('admin', 'owner', 'manager')
  ) INTO v_is_manager;
  
  -- Verify user is authorized to complete this task
  -- Either: direct assignment, role match, or manager
  IF NOT v_is_manager THEN
    IF v_task.assigned_to IS NOT NULL AND v_task.assigned_to != v_employee_id THEN
      -- Task is assigned to someone else
      RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;
    -- For role-based tasks, we trust the frontend filtered correctly
    -- Additional validation could be added here
  END IF;
  
  -- Compute scheduled time for this occurrence
  IF v_task.start_at IS NOT NULL THEN
    -- For recurring tasks, use the occurrence date but preserve time-of-day
    v_scheduled_at := p_occurrence_date + v_task.start_at::TIME;
  ELSE
    -- No scheduled time = no lock
    v_scheduled_at := NULL;
  END IF;
  
  -- Determine completion mode and enforce time-lock
  IF v_task.lock_mode = 'anytime' OR v_task.execution_mode = 'always_on' THEN
    -- No time-lock enforcement
    v_completion_mode := 'on_time';
  ELSIF v_scheduled_at IS NOT NULL THEN
    -- Calculate unlock time
    v_unlock_at := v_scheduled_at - (v_task.unlock_before_minutes || 30) * INTERVAL '1 minute';
    
    -- Calculate deadline
    IF v_task.duration_minutes IS NOT NULL THEN
      v_deadline := v_scheduled_at + v_task.duration_minutes * INTERVAL '1 minute';
    ELSIF v_task.due_at IS NOT NULL THEN
      v_deadline := v_task.due_at;
    ELSE
      v_deadline := NULL;
    END IF;
    
    -- Check timing
    IF p_override AND v_is_manager THEN
      -- Manager override
      v_completion_mode := 'override';
    ELSIF p_completed_at < v_unlock_at THEN
      -- Too early
      IF v_task.allow_early_completion THEN
        -- Early allowed with conditions
        IF v_task.early_requires_reason AND (p_reason IS NULL OR p_reason = '') THEN
          RAISE EXCEPTION 'EARLY_REQUIRES_REASON';
        END IF;
        IF v_task.early_requires_photo AND (p_photo_url IS NULL OR p_photo_url = '') THEN
          RAISE EXCEPTION 'EARLY_REQUIRES_PHOTO';
        END IF;
        v_completion_mode := 'early';
      ELSE
        -- Not allowed - return error with unlock time
        RAISE EXCEPTION 'TASK_LOCKED_UNTIL:%', v_unlock_at::TEXT;
      END IF;
    ELSIF v_deadline IS NOT NULL AND p_completed_at > v_deadline THEN
      -- Late completion (allowed but marked)
      v_completion_mode := 'late';
    ELSE
      -- Normal on-time completion
      v_completion_mode := 'on_time';
    END IF;
  ELSE
    v_completion_mode := 'on_time';
  END IF;
  
  -- Update the task
  UPDATE tasks SET
    status = 'completed',
    completed_at = p_completed_at,
    completed_by = v_employee_id,
    completed_late = (v_completion_mode = 'late'),
    completion_mode = v_completion_mode,
    completion_reason = CASE WHEN v_completion_mode IN ('early', 'override') THEN p_reason ELSE NULL END,
    completion_photo_url = CASE WHEN v_completion_mode = 'early' THEN p_photo_url ELSE NULL END,
    overridden_by = CASE WHEN v_completion_mode = 'override' THEN v_user_id ELSE NULL END,
    overridden_reason = CASE WHEN v_completion_mode = 'override' THEN p_override_reason ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_task_id;
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'task_id', p_task_id,
    'completion_mode', v_completion_mode,
    'completed_at', p_completed_at,
    'completed_by', v_employee_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_task_guarded TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.complete_task_guarded IS 
'Guarded task completion with time-lock enforcement. 
Validates that user is authorized and task is within completion window.
Supports early completion (with reason/photo), late completion, and manager overrides.';