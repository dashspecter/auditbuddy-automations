-- Allow company owners and admins to manage platform roles for users in their company
DROP POLICY IF EXISTS "Company owners and admins can manage user roles" ON public.user_roles;

CREATE POLICY "Company owners and admins can manage user roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu1
    WHERE cu1.user_id = auth.uid()
    AND (cu1.company_role = 'company_owner' OR cu1.company_role = 'company_admin')
    AND EXISTS (
      SELECT 1 FROM public.company_users cu2
      WHERE cu2.user_id = user_roles.user_id
      AND cu2.company_id = cu1.company_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu1
    WHERE cu1.user_id = auth.uid()
    AND (cu1.company_role = 'company_owner' OR cu1.company_role = 'company_admin')
    AND EXISTS (
      SELECT 1 FROM public.company_users cu2
      WHERE cu2.user_id = user_roles.user_id
      AND cu2.company_id = cu1.company_id
    )
  )
);