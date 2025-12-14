-- Add INSERT policy for company owners and admins
CREATE POLICY "Company owners and admins can insert employees"
ON public.employees
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_company_role(auth.uid(), 'company_owner'::text) 
    OR has_company_role(auth.uid(), 'company_admin'::text)
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);