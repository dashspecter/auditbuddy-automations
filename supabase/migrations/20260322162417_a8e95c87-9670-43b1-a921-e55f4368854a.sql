
-- Drop the conflicting policy and recreate
DROP POLICY IF EXISTS "Users can manage own dash preferences" ON public.dash_user_preferences;

CREATE POLICY "Users manage own dash preferences"
  ON public.dash_user_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));
