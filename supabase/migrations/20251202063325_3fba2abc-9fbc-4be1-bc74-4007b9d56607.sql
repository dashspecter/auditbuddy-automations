-- Add RLS policy to allow employees to claim shifts (insert shift_assignments)
CREATE POLICY "Employees can claim shifts"
ON shift_assignments
FOR INSERT
TO public
WITH CHECK (
  -- Verify the staff_id belongs to the current user
  staff_id IN (
    SELECT id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
  AND
  -- Verify the shift exists and belongs to the same company
  EXISTS (
    SELECT 1 
    FROM shifts s
    JOIN employees e ON e.company_id = s.company_id
    WHERE s.id = shift_assignments.shift_id
      AND e.id = shift_assignments.staff_id
      AND e.user_id = auth.uid()
  )
);