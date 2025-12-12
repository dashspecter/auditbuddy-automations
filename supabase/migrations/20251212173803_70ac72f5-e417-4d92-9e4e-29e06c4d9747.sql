
-- Allow company users to view profiles of other users in the same company
CREATE POLICY "Company users can view profiles in same company"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cu2.user_id 
    FROM company_users cu1
    JOIN company_users cu2 ON cu1.company_id = cu2.company_id
    WHERE cu1.user_id = auth.uid()
  )
);
