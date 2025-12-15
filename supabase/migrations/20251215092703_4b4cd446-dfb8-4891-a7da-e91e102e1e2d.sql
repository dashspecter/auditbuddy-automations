-- Drop the existing INSERT policy that doesn't work for staff
DROP POLICY IF EXISTS "Users can create attendance logs" ON public.attendance_logs;

-- Create a new INSERT policy that works for both company users AND employees (staff)
CREATE POLICY "Users can create attendance logs" 
ON public.attendance_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = attendance_logs.staff_id
    AND (
      -- Staff member creating their own attendance record
      e.user_id = auth.uid()
      OR
      -- Manager/admin from same company
      e.company_id = get_user_company_id(auth.uid())
    )
  )
);