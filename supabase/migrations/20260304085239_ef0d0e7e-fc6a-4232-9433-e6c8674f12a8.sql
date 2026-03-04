
-- Fix 1: SELECT policy — allow staff (in employees table) to also see company submissions
DROP POLICY IF EXISTS "Company members can view submissions" ON public.form_submissions;
CREATE POLICY "Company members can view submissions"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
    UNION
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);

-- Fix 2: UPDATE policy — allow any company member to update non-locked submissions (for shared monthly forms)
DROP POLICY IF EXISTS "Staff can update own non-locked submissions" ON public.form_submissions;
CREATE POLICY "Company members can update non-locked submissions"
ON public.form_submissions
FOR UPDATE
TO authenticated
USING (
  status IN ('draft', 'submitted')
  AND company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
    UNION
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
    UNION
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);
