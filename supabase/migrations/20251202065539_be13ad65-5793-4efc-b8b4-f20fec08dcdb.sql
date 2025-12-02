-- Add policy for employees to update status of their own shifts
CREATE POLICY "Employees can update their shift status"
ON shift_assignments
FOR UPDATE
USING (
  staff_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  staff_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);