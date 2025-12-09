-- Add policy to allow staff to update their own attendance logs (for checkout)
CREATE POLICY "Staff can update their own attendance logs"
ON public.attendance_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = attendance_logs.staff_id 
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = attendance_logs.staff_id 
    AND e.user_id = auth.uid()
  )
);