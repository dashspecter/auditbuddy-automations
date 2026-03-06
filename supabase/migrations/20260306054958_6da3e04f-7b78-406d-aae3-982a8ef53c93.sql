
CREATE OR REPLACE FUNCTION public.get_company_overview(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  caller_role text;
BEGIN
  -- Validate caller is a platform admin
  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin';

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: platform admin role required';
  END IF;

  SELECT jsonb_build_object(
    'employees_count', (SELECT count(*) FROM public.employees WHERE company_id = target_company_id),
    'locations_count', (SELECT count(*) FROM public.locations WHERE company_id = target_company_id),
    'departments_count', (SELECT count(*) FROM public.departments WHERE company_id = target_company_id),
    'tasks_total', (SELECT count(*) FROM public.tasks WHERE company_id = target_company_id),
    'tasks_completed', (SELECT count(*) FROM public.tasks WHERE company_id = target_company_id AND status = 'completed'),
    'audit_templates_count', (SELECT count(*) FROM public.audit_templates WHERE company_id = target_company_id),
    'audits_count', (SELECT count(*) FROM public.location_audits WHERE company_id = target_company_id),
    'corrective_actions_count', (SELECT count(*) FROM public.corrective_actions WHERE company_id = target_company_id),
    'shifts_count', (SELECT count(*) FROM public.shifts WHERE company_id = target_company_id),
    'last_audit_at', (SELECT max(created_at) FROM public.location_audits WHERE company_id = target_company_id),
    'last_task_at', (SELECT max(created_at) FROM public.tasks WHERE company_id = target_company_id),
    'last_shift_at', (SELECT max(created_at) FROM public.shifts WHERE company_id = target_company_id),
    'owner_email', (
      SELECT au.email FROM auth.users au
      INNER JOIN public.company_users cu ON cu.user_id = au.id
      WHERE cu.company_id = target_company_id
      ORDER BY cu.created_at ASC
      LIMIT 1
    ),
    'company_users_count', (SELECT count(*) FROM public.company_users WHERE company_id = target_company_id)
  ) INTO result;

  RETURN result;
END;
$$;
