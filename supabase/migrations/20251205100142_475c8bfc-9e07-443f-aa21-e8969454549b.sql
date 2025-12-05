-- Add 'hr' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';

-- Update the has_role function to handle the new role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;