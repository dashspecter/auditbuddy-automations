-- Drop the old restrictive policy
DROP POLICY "Staff can update own draft submissions" ON public.form_submissions;

-- Create new policy: staff can update their own submissions that are draft or submitted (not locked)
CREATE POLICY "Staff can update own non-locked submissions"
ON public.form_submissions
FOR UPDATE
USING (submitted_by = auth.uid() AND status IN ('draft', 'submitted'))
WITH CHECK (submitted_by = auth.uid());