
-- Fix get_user_company_id to return the MOST RECENT company for multi-company users
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- Fix get_employee_company_id to also order by created_at
CREATE OR REPLACE FUNCTION public.get_employee_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id
  FROM public.employees
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- Remove the overly permissive location policies that allow public access
DROP POLICY IF EXISTS "Public can view locations" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view locations for public forms" ON public.locations;

-- Remove overly permissive equipment policy
DROP POLICY IF EXISTS "Public can view equipment by id" ON public.equipment;
