-- Fix recurring_maintenance_schedules RLS policy to allow company_admin/owner roles
DROP POLICY IF EXISTS "Admins and managers can manage recurring schedules" ON public.recurring_maintenance_schedules;

CREATE POLICY "Admins and managers can manage recurring schedules"
ON public.recurring_maintenance_schedules
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Also fix the SELECT policy to include company_admin/owner
DROP POLICY IF EXISTS "Users can view schedules for their assigned equipment" ON public.recurring_maintenance_schedules;

CREATE POLICY "Users can view schedules for their assigned equipment"
ON public.recurring_maintenance_schedules
FOR SELECT
USING (
  (auth.uid() = assigned_user_id) 
  OR (auth.uid() = supervisor_user_id) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);