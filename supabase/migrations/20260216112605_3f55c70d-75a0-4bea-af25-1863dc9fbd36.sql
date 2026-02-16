
-- Secure materialized views: They need RLS-like protection.
-- Since materialized views don't support RLS directly, we create
-- security-definer wrapper functions that filter by company_id.

-- Wrapper function for audit stats
CREATE OR REPLACE FUNCTION public.get_mv_audit_stats(p_company_id uuid)
RETURNS SETOF public.mv_audit_stats_by_location
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_audit_stats_by_location
  WHERE company_id = p_company_id;
$$;

-- Wrapper function for section scores
CREATE OR REPLACE FUNCTION public.get_mv_section_scores(p_company_id uuid)
RETURNS SETOF public.mv_audit_section_scores
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_audit_section_scores
  WHERE company_id = p_company_id;
$$;

-- Wrapper function for attendance stats
CREATE OR REPLACE FUNCTION public.get_mv_attendance_stats(p_company_id uuid, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS SETOF public.mv_attendance_daily_stats
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_attendance_daily_stats
  WHERE company_id = p_company_id
    AND (p_start_date IS NULL OR shift_date >= p_start_date)
    AND (p_end_date IS NULL OR shift_date <= p_end_date);
$$;

-- Wrapper function for task completion stats
CREATE OR REPLACE FUNCTION public.get_mv_task_stats(p_company_id uuid, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS SETOF public.mv_task_completion_stats
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_task_completion_stats
  WHERE company_id = p_company_id
    AND (p_start_date IS NULL OR occurrence_date >= p_start_date)
    AND (p_end_date IS NULL OR occurrence_date <= p_end_date);
$$;

-- Revoke direct access to materialized views from anon/authenticated
-- Force usage through the wrapper functions
REVOKE ALL ON public.mv_audit_stats_by_location FROM anon, authenticated;
REVOKE ALL ON public.mv_audit_section_scores FROM anon, authenticated;
REVOKE ALL ON public.mv_attendance_daily_stats FROM anon, authenticated;
REVOKE ALL ON public.mv_task_completion_stats FROM anon, authenticated;

-- Grant execute on wrapper functions
GRANT EXECUTE ON FUNCTION public.get_mv_audit_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mv_section_scores(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mv_attendance_stats(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mv_task_stats(uuid, date, date) TO authenticated;
