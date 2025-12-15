-- Drop the existing INSERT policy and recreate with clearer conditions
DROP POLICY IF EXISTS "Users can create time off requests" ON public.time_off_requests;

-- Create a simpler, clearer INSERT policy
CREATE POLICY "Users can create time off requests" ON public.time_off_requests
FOR INSERT 
WITH CHECK (
  -- Employees can create their own requests
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id 
    AND e.user_id = auth.uid()
  )
  OR
  -- Company admins/owners can create for any employee in their company
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = time_off_requests.company_id
    AND cu.company_role IN ('company_admin', 'company_owner')
  )
  OR
  -- App-level admins and managers can create for employees in their company
  (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  ) AND company_id = get_user_company_id(auth.uid())
);

-- Also add SELECT policy for company owners/admins
DROP POLICY IF EXISTS "Users can view time off requests" ON public.time_off_requests;

CREATE POLICY "Users can view time off requests" ON public.time_off_requests
FOR SELECT 
USING (
  -- Employees can view their own requests
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id 
    AND e.user_id = auth.uid()
  )
  OR
  -- Company admins/owners can view all requests in their company
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = time_off_requests.company_id
    AND cu.company_role IN ('company_admin', 'company_owner')
  )
  OR
  -- App-level admins and managers can view requests in their company
  (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  ) AND company_id = get_user_company_id(auth.uid())
);