-- Drop existing policy and create a more permissive one for document management
DROP POLICY IF EXISTS "Admins and managers can manage documents" ON public.documents;

-- Create new policy that allows company users to manage documents for their company
CREATE POLICY "Company users can manage their company documents" 
ON public.documents 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);