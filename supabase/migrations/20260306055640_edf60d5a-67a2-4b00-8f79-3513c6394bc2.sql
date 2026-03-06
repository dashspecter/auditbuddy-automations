
-- Rename max_users to max_employees
ALTER TABLE public.companies RENAME COLUMN max_users TO max_employees;

-- Create trigger function to enforce employee limit on INSERT
CREATE OR REPLACE FUNCTION public.check_employee_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  SELECT max_employees INTO max_limit
  FROM public.companies
  WHERE id = NEW.company_id;

  IF max_limit IS NOT NULL THEN
    SELECT count(*) INTO current_count
    FROM public.employees
    WHERE company_id = NEW.company_id;

    IF current_count >= max_limit THEN
      RAISE EXCEPTION 'Employee limit reached (%). Contact your platform administrator to increase the limit.', max_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER enforce_employee_limit
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.check_employee_limit();

-- Update get_company_overview to also return company_users_count
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
  SELECT ur.role INTO caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  LIMIT 1;

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
      SELECT p.email FROM public.profiles p
      JOIN public.company_users cu ON cu.user_id = p.id
      WHERE cu.company_id = target_company_id AND cu.company_role = 'company_owner'
      LIMIT 1
    ),
    'company_users_count', (SELECT count(*) FROM public.company_users WHERE company_id = target_company_id)
  ) INTO result;

  RETURN result;
END;
$$;
