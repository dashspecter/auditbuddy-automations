-- Add public SELECT policy for test_questions to allow unauthenticated access via assignment links
-- This allows employees to load test questions when accessing tests via /t/:shortCode

CREATE POLICY "Public can view questions for active tests"
ON public.test_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id
    AND t.is_active = true
  )
);