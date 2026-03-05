CREATE OR REPLACE FUNCTION public.get_all_company_owners()
RETURNS TABLE(company_id uuid, full_name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT cu.company_id, p.full_name, p.email
  FROM company_users cu
  JOIN profiles p ON p.id = cu.user_id
  WHERE cu.company_role = 'company_owner';
END;
$$;