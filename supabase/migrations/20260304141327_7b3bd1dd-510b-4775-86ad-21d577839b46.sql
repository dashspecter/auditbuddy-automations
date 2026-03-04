CREATE POLICY "Assigned users can update their scheduled audit status"
ON public.scheduled_audits
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND assigned_to = auth.uid()
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND assigned_to = auth.uid()
);