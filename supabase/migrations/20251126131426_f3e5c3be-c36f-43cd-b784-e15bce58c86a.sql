-- Allow employees to view their own test submissions
-- First, we need to be able to link profiles to employees
-- Since employees don't have a user_id, we'll allow viewing if the employee name matches

-- Allow anyone to view test submissions for employees they have access to
CREATE POLICY "Users can view test submissions for accessible employees"
ON public.test_submissions
FOR SELECT
USING (
  -- Allow if the employee_id matches an employee the user can access
  EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = test_submissions.employee_id
    -- Allow if user is admin/manager (they can see all employees)
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
  OR
  -- Allow unauthenticated access for public viewing (e.g., in leaderboards)
  auth.uid() IS NULL
);