-- Add INSERT policy for company owners and admins to create shift assignments
CREATE POLICY "Company owners and admins can insert shift assignments"
ON public.shift_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (
      has_company_role(auth.uid(), 'company_owner') OR
      has_company_role(auth.uid(), 'company_admin')
    )
  )
);