-- Update the companies SELECT policy to also allow employees to view their company settings
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (
  -- Allow company_users to view their company
  id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  OR
  -- Allow employees to view their company
  id IN (SELECT company_id FROM employees WHERE user_id = auth.uid())
);