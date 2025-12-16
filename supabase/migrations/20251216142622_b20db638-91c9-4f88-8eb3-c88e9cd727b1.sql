-- Drop existing policies
DROP POLICY IF EXISTS "Managers can manage payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Managers can view payroll periods" ON public.payroll_periods;

-- Create new policies that check both user_roles and company_users
CREATE POLICY "Company admins can manage payroll periods" 
ON public.payroll_periods
FOR ALL
USING (
  company_id = public.get_user_company_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_company_role(auth.uid(), 'company_owner') OR
    public.has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_company_role(auth.uid(), 'company_owner') OR
    public.has_company_role(auth.uid(), 'company_admin')
  )
);