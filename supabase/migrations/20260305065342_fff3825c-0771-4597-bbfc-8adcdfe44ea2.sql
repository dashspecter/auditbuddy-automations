
-- Part A: Backfill company_id on existing tests
UPDATE tests SET company_id = get_user_company_id(created_by)
WHERE company_id IS NULL AND created_by IS NOT NULL;

-- Make company_id NOT NULL going forward
ALTER TABLE tests ALTER COLUMN company_id SET NOT NULL;

-- Part B: Replace insecure role-only RLS policy with company-scoped one
DROP POLICY IF EXISTS "Admins and managers can manage tests" ON tests;

CREATE POLICY "Company managers can manage their tests"
ON tests FOR ALL TO authenticated
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Part C: Fix test_submissions SELECT policy to add company scoping
DROP POLICY IF EXISTS "Admins and managers can view all submissions" ON test_submissions;

CREATE POLICY "Users can view submissions in their company"
ON test_submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tests t
    WHERE t.id = test_submissions.test_id
    AND t.company_id = get_user_company_id(auth.uid())
  )
);
