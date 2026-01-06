-- Drop the insecure public policy that allows unauthenticated access to all companies
DROP POLICY IF EXISTS "Public can view company info" ON public.companies;

-- Update existing policies to use authenticated role instead of public
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Company owners and admins can update their company" ON public.companies;
CREATE POLICY "Company owners and admins can update their company" ON public.companies
FOR UPDATE TO authenticated
USING (
  id = get_user_company_id(auth.uid()) 
  AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
);