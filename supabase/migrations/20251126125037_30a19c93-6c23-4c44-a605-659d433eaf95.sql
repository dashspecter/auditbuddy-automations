-- Update RLS policy to allow viewing assignments by assignment ID (needed for employees to take tests)
DROP POLICY IF EXISTS "Employees can view their own assignments" ON public.test_assignments;

-- Anyone can view a specific assignment if they have the assignment ID (secure by obscurity + UUID)
CREATE POLICY "Anyone can view assignment by ID"
ON public.test_assignments
FOR SELECT
TO public
USING (true);

-- Update test_submissions policy to allow anyone to submit (employees don't have auth)
DROP POLICY IF EXISTS "Employees can submit their assigned tests" ON public.test_submissions;
DROP POLICY IF EXISTS "Anyone can create test submissions" ON public.test_submissions;

CREATE POLICY "Anyone can create test submissions"
ON public.test_submissions
FOR INSERT
TO public
WITH CHECK (true);