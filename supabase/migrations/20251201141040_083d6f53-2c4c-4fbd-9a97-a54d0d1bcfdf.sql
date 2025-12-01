-- Allow employees to view shifts where they are assigned
CREATE POLICY "Employees can view their assigned shifts"
ON public.shifts
FOR SELECT
USING (
  id IN (
    SELECT shift_id 
    FROM shift_assignments sa
    JOIN employees e ON sa.staff_id = e.id
    WHERE e.user_id = auth.uid()
  )
);

-- Allow employees to view locations in their company
CREATE POLICY "Employees can view locations in their company"
ON public.locations
FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);