-- Allow public access to employee info when accessed through valid test assignments
CREATE POLICY "Anyone can view employees through test assignments"
ON public.employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.test_assignments
    WHERE test_assignments.employee_id = employees.id
    AND test_assignments.short_code IS NOT NULL
  )
);