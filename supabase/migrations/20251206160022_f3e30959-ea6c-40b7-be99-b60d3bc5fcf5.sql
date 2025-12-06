-- Fix test_assignments RLS policies
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Anyone can view assignment by ID" ON test_assignments;
DROP POLICY IF EXISTS "Anyone can update test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Anyone can view test assignments by short code" ON test_assignments;

-- Create proper authenticated policies for test_assignments
CREATE POLICY "Employees can view their own assignments" ON test_assignments
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Employees can update their own assignments" ON test_assignments
FOR UPDATE TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can create test assignments" ON test_assignments
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can delete test assignments" ON test_assignments
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Fix test_submissions RLS policies
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can create test submissions" ON test_submissions;
DROP POLICY IF EXISTS "Anyone can insert test submissions" ON test_submissions;
DROP POLICY IF EXISTS "Anyone can view their own test submissions" ON test_submissions;
DROP POLICY IF EXISTS "Anyone can view test submissions" ON test_submissions;

-- Create proper authenticated policies for test_submissions
CREATE POLICY "Employees can view their own submissions" ON test_submissions
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Employees can submit their own tests" ON test_submissions
FOR INSERT TO authenticated
WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Employees can update their own submissions" ON test_submissions
FOR UPDATE TO authenticated
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);