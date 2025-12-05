-- Fix PUBLIC_DATA_EXPOSURE: Test content should only be visible to company members

-- Drop overly permissive policies on tests table
DROP POLICY IF EXISTS "Authenticated users can view active tests" ON tests;

-- Drop overly permissive policies on test_questions table  
DROP POLICY IF EXISTS "Anyone can view questions for active tests" ON test_questions;

-- Create company-scoped policy for tests
-- Users can only view active tests from their own company
CREATE POLICY "Users can view active tests in their company"
ON tests FOR SELECT
USING (
  is_active = true 
  AND company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
    UNION
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  )
);

-- Create company-scoped policy for test_questions
-- Users can only view questions for tests in their company
CREATE POLICY "Users can view questions for company tests"
ON test_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tests t
    WHERE t.id = test_questions.test_id
    AND t.company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  )
);