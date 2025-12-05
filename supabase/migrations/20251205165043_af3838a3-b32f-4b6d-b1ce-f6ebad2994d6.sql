-- Allow anonymous users to insert test submissions
DROP POLICY IF EXISTS "Anyone can insert test submissions" ON public.test_submissions;
CREATE POLICY "Anyone can insert test submissions" 
ON public.test_submissions 
FOR INSERT 
WITH CHECK (true);

-- Allow anonymous users to read test submissions they created (by matching staff_name/staff_location)
DROP POLICY IF EXISTS "Anyone can view their own test submissions" ON public.test_submissions;
CREATE POLICY "Anyone can view their own test submissions" 
ON public.test_submissions 
FOR SELECT 
USING (true);

-- Allow anyone to read tests (needed to take tests)
DROP POLICY IF EXISTS "Anyone can view active tests" ON public.tests;
CREATE POLICY "Anyone can view active tests" 
ON public.tests 
FOR SELECT 
USING (is_active = true);

-- Allow anyone to read test questions for active tests
DROP POLICY IF EXISTS "Anyone can view questions for active tests" ON public.test_questions;
CREATE POLICY "Anyone can view questions for active tests" 
ON public.test_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = test_questions.test_id 
    AND tests.is_active = true
  )
);

-- Allow anyone to read test assignments (for short code lookup)
DROP POLICY IF EXISTS "Anyone can view test assignments" ON public.test_assignments;
CREATE POLICY "Anyone can view test assignments" 
ON public.test_assignments 
FOR SELECT 
USING (true);

-- Allow anyone to update test assignments (to mark as completed)
DROP POLICY IF EXISTS "Anyone can update test assignments" ON public.test_assignments;
CREATE POLICY "Anyone can update test assignments" 
ON public.test_assignments 
FOR UPDATE 
USING (true)
WITH CHECK (true);