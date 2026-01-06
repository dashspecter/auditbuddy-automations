-- Drop existing policies
DROP POLICY IF EXISTS "Managers can insert template assignments" ON audit_template_checkers;
DROP POLICY IF EXISTS "Managers can delete template assignments" ON audit_template_checkers;

-- Create updated INSERT policy that also checks user_roles table
CREATE POLICY "Managers can insert template assignments" 
ON audit_template_checkers 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM audit_templates at
    JOIN company_users cu ON cu.company_id = at.company_id
    WHERE at.id = audit_template_checkers.template_id 
    AND cu.user_id = auth.uid()
    AND (
      cu.company_role IN ('company_owner', 'company_admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager')
      )
    )
  )
);

-- Create updated DELETE policy that also checks user_roles table
CREATE POLICY "Managers can delete template assignments" 
ON audit_template_checkers 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM audit_templates at
    JOIN company_users cu ON cu.company_id = at.company_id
    WHERE at.id = audit_template_checkers.template_id 
    AND cu.user_id = auth.uid()
    AND (
      cu.company_role IN ('company_owner', 'company_admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager')
      )
    )
  )
);