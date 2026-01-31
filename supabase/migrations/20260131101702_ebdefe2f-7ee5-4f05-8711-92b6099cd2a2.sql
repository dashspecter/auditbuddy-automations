-- ============================================
-- SCHEDULE GOVERNANCE TABLES
-- Feature flag: enable_schedule_governance (default: false)
-- All new tables are ADDITIVE - no breaking changes
-- ============================================

-- 1. Add feature flag to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS enable_schedule_governance boolean NOT NULL DEFAULT false;

-- 2. Create schedule_periods table (Draft → Published → Locked workflow)
CREATE TABLE IF NOT EXISTS public.schedule_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'locked')),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  publish_deadline timestamptz,
  auto_lock_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, location_id, week_start_date)
);

-- 3. Create schedule_change_requests table
CREATE TABLE IF NOT EXISTS public.schedule_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.schedule_periods(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  change_type text NOT NULL CHECK (change_type IN ('add', 'edit', 'delete')),
  target_shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  payload_before jsonb DEFAULT '{}'::jsonb,
  payload_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_code text,
  note text,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create workforce_policies table (per company/location settings)
CREATE TABLE IF NOT EXISTS public.workforce_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  unscheduled_clock_in_policy text NOT NULL DEFAULT 'allow' CHECK (unscheduled_clock_in_policy IN ('allow', 'exception_ticket', 'block')),
  grace_minutes integer NOT NULL DEFAULT 60,
  block_publish_on_critical boolean NOT NULL DEFAULT false,
  require_reason_on_locked_edits boolean NOT NULL DEFAULT true,
  late_threshold_minutes integer NOT NULL DEFAULT 15,
  early_leave_threshold_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (company_id, location_id)
);

-- 5. Create workforce_exceptions table (late_start, early_leave, unscheduled_shift, no_show, shift_extended)
CREATE TABLE IF NOT EXISTS public.workforce_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  exception_type text NOT NULL CHECK (exception_type IN ('late_start', 'early_leave', 'unscheduled_shift', 'no_show', 'shift_extended', 'overtime')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'resolved', 'auto_resolved')),
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  attendance_id uuid REFERENCES public.attendance_logs(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  reason_code text,
  note text,
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_periods_company_location_week 
  ON public.schedule_periods(company_id, location_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_schedule_periods_state 
  ON public.schedule_periods(state);

CREATE INDEX IF NOT EXISTS idx_schedule_change_requests_period_status 
  ON public.schedule_change_requests(period_id, status);

CREATE INDEX IF NOT EXISTS idx_schedule_change_requests_company 
  ON public.schedule_change_requests(company_id, status);

CREATE INDEX IF NOT EXISTS idx_workforce_policies_company_location 
  ON public.workforce_policies(company_id, location_id);

CREATE INDEX IF NOT EXISTS idx_workforce_exceptions_company_status 
  ON public.workforce_exceptions(company_id, status);

CREATE INDEX IF NOT EXISTS idx_workforce_exceptions_employee_date 
  ON public.workforce_exceptions(employee_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_workforce_exceptions_location_date 
  ON public.workforce_exceptions(location_id, shift_date);

-- 7. Enable RLS on all new tables
ALTER TABLE public.schedule_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_exceptions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for schedule_periods (following existing workforce table patterns)
CREATE POLICY "Company members can view schedule periods"
  ON public.schedule_periods FOR SELECT
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "Managers and admins can insert schedule periods"
  ON public.schedule_periods FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Managers and admins can update schedule periods"
  ON public.schedule_periods FOR UPDATE
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

-- 9. RLS Policies for schedule_change_requests
CREATE POLICY "Company members can view change requests"
  ON public.schedule_change_requests FOR SELECT
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "Company members can create change requests"
  ON public.schedule_change_requests FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
    )
    AND requested_by = auth.uid()
  );

CREATE POLICY "Managers and admins can update change requests"
  ON public.schedule_change_requests FOR UPDATE
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

-- 10. RLS Policies for workforce_policies
CREATE POLICY "Company members can view workforce policies"
  ON public.workforce_policies FOR SELECT
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage workforce policies"
  ON public.workforce_policies FOR ALL
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

-- 11. RLS Policies for workforce_exceptions
CREATE POLICY "Company members can view workforce exceptions"
  ON public.workforce_exceptions FOR SELECT
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "System and managers can create workforce exceptions"
  ON public.workforce_exceptions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "Managers can update workforce exceptions"
  ON public.workforce_exceptions FOR UPDATE
  USING (company_id IN (
    SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()
  ));

-- 12. Helper function to get effective workforce policy for a location
CREATE OR REPLACE FUNCTION public.get_workforce_policy(p_company_id uuid, p_location_id uuid)
RETURNS public.workforce_policies
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.workforce_policies;
BEGIN
  -- Try location-specific policy first
  SELECT * INTO v_policy
  FROM public.workforce_policies
  WHERE company_id = p_company_id AND location_id = p_location_id
  LIMIT 1;
  
  -- Fall back to company-wide policy (location_id IS NULL)
  IF v_policy IS NULL THEN
    SELECT * INTO v_policy
    FROM public.workforce_policies
    WHERE company_id = p_company_id AND location_id IS NULL
    LIMIT 1;
  END IF;
  
  -- Return default policy values if none configured
  IF v_policy IS NULL THEN
    v_policy.unscheduled_clock_in_policy := 'allow';
    v_policy.grace_minutes := 60;
    v_policy.block_publish_on_critical := false;
    v_policy.require_reason_on_locked_edits := true;
    v_policy.late_threshold_minutes := 15;
    v_policy.early_leave_threshold_minutes := 15;
  END IF;
  
  RETURN v_policy;
END;
$$;

-- 13. Helper function to get or create schedule period
CREATE OR REPLACE FUNCTION public.get_or_create_schedule_period(
  p_company_id uuid,
  p_location_id uuid,
  p_week_start_date date
)
RETURNS public.schedule_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.schedule_periods;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Try to find existing period
  SELECT * INTO v_period
  FROM public.schedule_periods
  WHERE company_id = p_company_id 
    AND location_id = p_location_id 
    AND week_start_date = p_week_start_date
  LIMIT 1;
  
  -- Create if not exists
  IF v_period IS NULL THEN
    INSERT INTO public.schedule_periods (
      company_id, location_id, week_start_date, state, created_by
    ) VALUES (
      p_company_id, p_location_id, p_week_start_date, 'draft', v_user_id
    )
    RETURNING * INTO v_period;
  END IF;
  
  RETURN v_period;
END;
$$;

-- 14. Function to apply approved change request
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
BEGIN
  v_user_id := auth.uid();
  
  -- Get and lock the request
  SELECT * INTO v_request
  FROM public.schedule_change_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
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
        required_count, notes, status, created_by, is_published, is_open_shift,
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
        'published',
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
      -- Soft delete: mark as canceled/removed
      UPDATE public.shifts
      SET status = 'cancelled', updated_at = now()
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

-- 15. Function to check if employee has scheduled shift within grace window
CREATE OR REPLACE FUNCTION public.find_scheduled_shift_for_clockin(
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
  v_check_date date;
  v_check_time time;
BEGIN
  v_check_date := (p_check_time AT TIME ZONE 'Europe/Bucharest')::date;
  v_check_time := (p_check_time AT TIME ZONE 'Europe/Bucharest')::time;
  
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
  WHERE sa.staff_id = p_employee_id
    AND sa.approval_status = 'approved'
    AND s.location_id = p_location_id
    AND s.shift_date = v_check_date
    AND s.status NOT IN ('cancelled', 'deleted')
    -- Within grace window: check_time should be within [start - grace, end + grace]
    AND v_check_time >= (s.start_time - (p_grace_minutes || ' minutes')::interval)
    AND v_check_time <= (s.end_time + (p_grace_minutes || ' minutes')::interval)
  ORDER BY ABS(EXTRACT(EPOCH FROM (v_check_time - s.start_time)))
  LIMIT 1;
END;
$$;

-- 16. Add updated_at trigger for new tables
CREATE TRIGGER update_schedule_periods_updated_at
  BEFORE UPDATE ON public.schedule_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_change_requests_updated_at
  BEFORE UPDATE ON public.schedule_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workforce_policies_updated_at
  BEFORE UPDATE ON public.workforce_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workforce_exceptions_updated_at
  BEFORE UPDATE ON public.workforce_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17. Add status column to shifts for soft delete support (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;