
-- Drop the overly complex "Managers can manage shift assignments" policy
-- and replace it with more specific policies for each operation

DROP POLICY IF EXISTS "Managers can manage shift assignments" ON shift_assignments;

-- Managers can SELECT shift assignments in their company
CREATE POLICY "Managers can view shift assignments in their company"
ON shift_assignments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

-- Managers can INSERT shift assignments in their company
CREATE POLICY "Managers can create shift assignments in their company"
ON shift_assignments
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

-- Managers can UPDATE shift assignments in their company
CREATE POLICY "Managers can update shift assignments in their company"
ON shift_assignments
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

-- Managers can DELETE shift assignments in their company
CREATE POLICY "Managers can delete shift assignments in their company"
ON shift_assignments
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_assignments.shift_id
    AND s.company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);
