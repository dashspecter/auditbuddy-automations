-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view attendance in their company" ON public.attendance_logs;

-- Create a new SELECT policy that works for both company users AND employees (staff)
CREATE POLICY "Users can view attendance in their company" 
ON public.attendance_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = attendance_logs.staff_id
    AND (
      -- Staff member viewing their own attendance records
      e.user_id = auth.uid()
      OR
      -- Company user (admin/manager) from same company
      e.company_id = get_user_company_id(auth.uid())
      OR
      -- Employee (staff with manager role) from same company
      e.company_id = get_employee_company_id(auth.uid())
    )
  )
);