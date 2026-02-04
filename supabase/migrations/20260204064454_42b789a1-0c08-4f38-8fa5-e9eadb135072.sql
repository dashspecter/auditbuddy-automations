
-- Create an RPC for kiosk to fetch task completions anonymously (SECURITY DEFINER bypasses RLS)
-- Mirrors the pattern from get_kiosk_attendance_logs

CREATE OR REPLACE FUNCTION public.get_kiosk_task_completions(
  p_token text,
  p_location_id uuid,
  p_company_id uuid,
  p_occurrence_date date,
  p_task_ids uuid[]
)
RETURNS TABLE (
  task_id uuid,
  occurrence_date date,
  completed_by_employee_id uuid,
  completed_at timestamptz,
  completion_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate kiosk token/slug against an active kiosk for this location
  IF NOT EXISTS (
    SELECT 1
    FROM public.attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (
        k.device_token = p_token
        OR k.custom_slug = p_token
      )
  ) THEN
    RETURN; -- Return empty if invalid token
  END IF;

  RETURN QUERY
  SELECT 
    tc.task_id,
    tc.occurrence_date,
    tc.completed_by_employee_id,
    tc.completed_at,
    tc.completion_mode
  FROM public.task_completions tc
  INNER JOIN public.tasks t ON t.id = tc.task_id
  WHERE tc.occurrence_date = p_occurrence_date
    AND tc.task_id = ANY(p_task_ids)
    AND t.company_id = p_company_id
  ORDER BY tc.completed_at DESC;
END;
$$;

-- Grant execute permission to anonymous users (kiosk is anonymous)
GRANT EXECUTE ON FUNCTION public.get_kiosk_task_completions(text, uuid, uuid, date, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_kiosk_task_completions(text, uuid, uuid, date, uuid[]) TO authenticated;
