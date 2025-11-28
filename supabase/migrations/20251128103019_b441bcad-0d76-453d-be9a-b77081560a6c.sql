-- Update RLS policy to ensure only company owners and admins can update company_users
DROP POLICY IF EXISTS "Company owners and admins can manage company users" ON company_users;

CREATE POLICY "Company owners and admins can manage company users"
ON company_users
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_company_role(auth.uid(), 'company_owner') 
    OR has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_company_role(auth.uid(), 'company_owner') 
    OR has_company_role(auth.uid(), 'company_admin')
  )
);