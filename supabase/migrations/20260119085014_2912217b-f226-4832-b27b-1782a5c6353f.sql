-- Fix RLS policies for tests module to include company_admin and company_owner roles
-- This ensures Doug Faulkner and similar users can create/manage tests

-- First, update tests table RLS policies
DROP POLICY IF EXISTS "Admins and managers can manage tests" ON tests;

CREATE POLICY "Admins and managers can manage tests"
ON tests FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Update test_questions RLS policies
DROP POLICY IF EXISTS "Admins and managers can manage questions" ON test_questions;

CREATE POLICY "Admins and managers can manage questions"
ON test_questions FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Update test_assignments RLS policies
DROP POLICY IF EXISTS "Admins and managers can manage test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Managers can create test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Managers can delete test assignments" ON test_assignments;

CREATE POLICY "Admins and managers can manage test assignments"
ON test_assignments FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Update test_submissions RLS policies to allow company admins to view
DROP POLICY IF EXISTS "Admins and managers can view all submissions" ON test_submissions;

CREATE POLICY "Admins and managers can view all submissions"
ON test_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);