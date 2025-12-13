-- Remove the insecure policy that allows anonymous access
DROP POLICY IF EXISTS "Users can view test submissions for accessible employees" ON public.test_submissions;

-- Create a corrected policy without anonymous access
CREATE POLICY "Users can view test submissions for accessible employees" 
ON public.test_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = test_submissions.employee_id 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);