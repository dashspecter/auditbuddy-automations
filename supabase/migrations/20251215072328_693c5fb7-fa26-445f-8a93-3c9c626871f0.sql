-- Add UPDATE policy for company owners and admins
CREATE POLICY "Company owners and admins can update employees" 
ON public.employees 
FOR UPDATE 
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_company_role(auth.uid(), 'company_owner'::text) 
    OR has_company_role(auth.uid(), 'company_admin'::text)
  )
);

-- Add DELETE policy for company owners and admins
CREATE POLICY "Company owners and admins can delete employees" 
ON public.employees 
FOR DELETE 
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_company_role(auth.uid(), 'company_owner'::text) 
    OR has_company_role(auth.uid(), 'company_admin'::text)
  )
);