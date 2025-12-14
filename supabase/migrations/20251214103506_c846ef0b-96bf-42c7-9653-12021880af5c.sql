-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create time off requests" ON public.time_off_requests;

-- Create a new INSERT policy that allows:
-- 1. Employees to create their own time off requests
-- 2. Company admins/owners via company_users table
-- 3. Platform managers/admins via user_roles table
CREATE POLICY "Users can create time off requests" 
ON public.time_off_requests 
FOR INSERT 
WITH CHECK (
  -- Employee creating their own request
  (EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = time_off_requests.employee_id 
    AND employees.user_id = auth.uid()
  ))
  OR
  -- Company admin/owner creating request for any employee in their company
  (
    company_id = get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = time_off_requests.company_id
      AND cu.company_role IN ('company_admin', 'company_owner')
    )
  )
  OR
  -- Platform manager/admin via user_roles
  (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
);