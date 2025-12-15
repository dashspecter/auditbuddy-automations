-- Drop the existing policy that only checks app_role
DROP POLICY IF EXISTS "Managers can manage kiosks in their company" ON attendance_kiosks;

-- Create new policy that also checks company_role
CREATE POLICY "Managers can manage kiosks in their company" 
ON attendance_kiosks 
FOR ALL 
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_admin')
    OR has_company_role(auth.uid(), 'company_owner')
  )
)
WITH CHECK (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_admin')
    OR has_company_role(auth.uid(), 'company_owner')
  )
);