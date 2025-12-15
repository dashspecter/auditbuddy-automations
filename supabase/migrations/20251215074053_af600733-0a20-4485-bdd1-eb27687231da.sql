-- Add DELETE policy for time_off_requests
CREATE POLICY "Users can delete time off requests" ON public.time_off_requests
FOR DELETE 
USING (
  -- Employees can delete their own pending requests
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_id 
      AND e.user_id = auth.uid()
    ) AND status = 'pending'
  )
  OR
  -- Company admins/owners can delete any request in their company
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = time_off_requests.company_id
    AND cu.company_role IN ('company_admin', 'company_owner')
  )
  OR
  -- App-level admins and managers can delete requests in their company
  (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  ) AND company_id = get_user_company_id(auth.uid())
);