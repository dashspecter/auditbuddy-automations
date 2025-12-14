-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Employees can create their own time off requests" ON public.time_off_requests;

-- Create a new INSERT policy that allows:
-- 1. Employees to create their own time off requests
-- 2. Managers/Admins to create time off requests for any employee in their company
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
  -- Manager/Admin creating request for any employee in their company
  (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
);