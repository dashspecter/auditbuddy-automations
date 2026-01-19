-- Fix equipment RLS policy to allow company_admin role to manage equipment
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and managers can manage equipment in their company" ON public.equipment;

-- Create a new policy that includes company_admin role
CREATE POLICY "Admins and managers can manage equipment in their company"
ON public.equipment
FOR ALL
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_admin'::text)
    OR has_company_role(auth.uid(), 'company_owner'::text)
  )
)
WITH CHECK (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_admin'::text)
    OR has_company_role(auth.uid(), 'company_owner'::text)
  )
);