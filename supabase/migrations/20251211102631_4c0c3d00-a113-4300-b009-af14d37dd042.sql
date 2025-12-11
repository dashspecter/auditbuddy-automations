-- Create enum for company permissions
CREATE TYPE public.company_permission AS ENUM (
  'manage_users',
  'manage_settings', 
  'manage_billing',
  'manage_modules',
  'view_reports',
  'manage_locations',
  'manage_employees',
  'manage_shifts',
  'manage_audits'
);

-- Create table to store permission assignments per company role
CREATE TABLE public.company_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_role TEXT NOT NULL CHECK (company_role IN ('company_admin', 'company_member')),
  permission company_permission NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, company_role, permission)
);

-- Enable RLS
ALTER TABLE public.company_role_permissions ENABLE ROW LEVEL SECURITY;

-- Only company owners can manage permissions
CREATE POLICY "Company owners can manage permissions"
ON public.company_role_permissions
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_company_role(auth.uid(), 'company_owner')
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND has_company_role(auth.uid(), 'company_owner')
);

-- All company users can view permissions
CREATE POLICY "Users can view permissions in their company"
ON public.company_role_permissions
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Create function to check if user has a specific company permission
CREATE OR REPLACE FUNCTION public.has_company_permission(_user_id UUID, _permission company_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Company owners have all permissions
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = _user_id AND cu.company_role = 'company_owner'
  ) OR EXISTS (
    -- Check if permission is granted to user's company role
    SELECT 1 
    FROM company_users cu
    JOIN company_role_permissions crp ON crp.company_id = cu.company_id AND crp.company_role = cu.company_role
    WHERE cu.user_id = _user_id AND crp.permission = _permission
  )
$$;

-- Insert default permissions for admins (owners can customize later)
-- This will be done per-company when needed