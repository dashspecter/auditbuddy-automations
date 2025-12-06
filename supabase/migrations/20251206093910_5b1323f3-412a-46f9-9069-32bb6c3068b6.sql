-- Add RLS policy for employee managers to view shift assignments in their company
CREATE POLICY "Employee managers can view shift assignments in their company"
ON public.shift_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM shifts s
    JOIN employees e ON e.company_id = s.company_id
    WHERE s.id = shift_assignments.shift_id 
    AND e.user_id = auth.uid() 
    AND LOWER(e.role) = 'manager'
  )
);