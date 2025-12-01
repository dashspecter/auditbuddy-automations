-- Allow employees to view their own employee record
CREATE POLICY "Employees can view their own record"
ON public.employees
FOR SELECT
USING (auth.uid() = user_id);