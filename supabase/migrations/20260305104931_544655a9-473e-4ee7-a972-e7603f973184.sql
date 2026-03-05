CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  OR (
    _role = 'manager'::app_role
    AND EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = _user_id
        AND company_role IN ('company_owner', 'company_admin')
    )
  )
$$;