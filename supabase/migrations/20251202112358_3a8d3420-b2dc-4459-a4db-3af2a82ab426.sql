-- Update locations table RLS policies to include company owners and admins

-- Drop existing update policy
DROP POLICY IF EXISTS "Admins and managers can update locations" ON locations;

-- Create new update policy that includes company roles
CREATE POLICY "Admins, managers, and company owners can update locations" 
ON locations 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  (company_id = get_user_company_id(auth.uid()) AND 
   (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')))
);

-- Update location_operating_schedules RLS policies

-- Drop existing policy
DROP POLICY IF EXISTS "Managers can manage location schedules" ON location_operating_schedules;

-- Create new policy that includes company roles
CREATE POLICY "Managers and company owners can manage location schedules" 
ON location_operating_schedules 
FOR ALL 
TO public
USING (
  (location_id IN (
    SELECT id FROM locations WHERE company_id = get_user_company_id(auth.uid())
  )) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR 
    has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  (location_id IN (
    SELECT id FROM locations WHERE company_id = get_user_company_id(auth.uid())
  )) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR 
    has_company_role(auth.uid(), 'company_admin')
  )
);