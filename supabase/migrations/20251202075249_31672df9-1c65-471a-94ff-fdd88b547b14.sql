-- Fix RLS policy for time_off_requests to allow employees to create their own requests
-- The issue is that the current policy checks company_id against get_user_company_id()
-- which may not work for all staff users. Instead, we should check that the employee_id
-- belongs to the authenticated user.

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Employees can create time off requests" ON time_off_requests;

-- Create a new INSERT policy that checks employee_id matches the current user
CREATE POLICY "Employees can create their own time off requests"
  ON time_off_requests 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = employee_id 
      AND user_id = auth.uid()
    )
  );

-- Also update the SELECT policy to be more permissive for employees viewing their own requests
DROP POLICY IF EXISTS "Users can view time off in their company" ON time_off_requests;

CREATE POLICY "Users can view time off requests"
  ON time_off_requests 
  FOR SELECT 
  USING (
    -- Employees can view their own requests
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = employee_id 
      AND user_id = auth.uid()
    )
    OR
    -- Managers can view all requests in their company
    (
      company_id = get_user_company_id(auth.uid()) 
      AND (
        has_role(auth.uid(), 'admin'::app_role) 
        OR has_role(auth.uid(), 'manager'::app_role)
      )
    )
  );