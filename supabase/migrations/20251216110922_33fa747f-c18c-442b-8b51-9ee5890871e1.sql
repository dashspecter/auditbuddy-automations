-- Drop the old policy
DROP POLICY IF EXISTS "Managers can manage labor costs" ON public.labor_costs;

-- Create updated policy that includes company admins and owners
CREATE POLICY "Managers can manage labor costs" 
ON public.labor_costs 
FOR ALL 
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_owner')
    OR has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_owner')
    OR has_company_role(auth.uid(), 'company_admin')
  )
);