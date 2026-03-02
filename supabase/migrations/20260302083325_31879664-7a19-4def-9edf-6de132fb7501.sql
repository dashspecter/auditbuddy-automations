
-- Allow platform admins (users with 'admin' role) to manage company_modules for ANY company
CREATE POLICY "Platform admins can manage all company modules"
  ON public.company_modules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can view all company modules"
  ON public.company_modules FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
