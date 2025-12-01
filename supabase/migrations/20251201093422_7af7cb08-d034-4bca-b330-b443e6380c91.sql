-- Critical Security Fix: Remove overly permissive RLS policies that allow cross-company data access
-- These policies allowed any authenticated user to view data from all companies

-- Fix 1: equipment_documents - Remove "Anyone can view" policy and ensure company filtering
DROP POLICY IF EXISTS "Anyone can view equipment documents" ON equipment_documents;

-- Create proper policy for equipment_documents that filters by company
CREATE POLICY "Users can view equipment documents in their company"
ON equipment_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.id = equipment_documents.equipment_id
    AND e.company_id = get_user_company_id(auth.uid())
  )
);

-- Fix 2: equipment_interventions - Remove "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view equipment interventions" ON equipment_interventions;

-- Create proper policy for equipment_interventions that filters by company
CREATE POLICY "Users can view interventions in their company"
ON equipment_interventions
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  OR auth.uid() = performed_by_user_id
  OR auth.uid() = supervised_by_user_id
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 3: equipment_status_history - Remove "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view equipment status history" ON equipment_status_history;

-- Create proper policy for equipment_status_history that filters by company
CREATE POLICY "Users can view status history in their company"
ON equipment_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.id = equipment_status_history.equipment_id
    AND e.company_id = get_user_company_id(auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Add comments for documentation
COMMENT ON POLICY "Users can view equipment documents in their company" ON equipment_documents IS 
'Restricts equipment document access to users within the same company';

COMMENT ON POLICY "Users can view interventions in their company" ON equipment_interventions IS 
'Restricts equipment intervention access to company members, assigned users, or managers/admins';

COMMENT ON POLICY "Users can view status history in their company" ON equipment_status_history IS 
'Restricts equipment status history to company members or managers/admins';