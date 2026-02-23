DROP POLICY "Admins and owners can create roles" ON public.employee_roles;
DROP POLICY "Admins and owners can update roles" ON public.employee_roles;
DROP POLICY "Admins and owners can delete roles" ON public.employee_roles;

CREATE POLICY "Managers can create roles"
  ON public.employee_roles FOR INSERT
  WITH CHECK (user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Managers can update roles"
  ON public.employee_roles FOR UPDATE
  USING (user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Managers can delete roles"
  ON public.employee_roles FOR DELETE
  USING (user_is_manager_in_company(auth.uid(), company_id));