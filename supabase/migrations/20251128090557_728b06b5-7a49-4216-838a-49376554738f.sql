-- Drop the existing policy that uses get_user_company_id function
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- Create a simpler policy that directly checks company_users
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );