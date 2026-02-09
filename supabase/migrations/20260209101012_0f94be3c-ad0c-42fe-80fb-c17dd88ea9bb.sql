
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.company_users WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1),
    (SELECT company_id FROM public.employees WHERE user_id = _user_id LIMIT 1)
  )
$$;
