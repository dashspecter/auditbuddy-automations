CREATE POLICY "Users can view company members in their company"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
);