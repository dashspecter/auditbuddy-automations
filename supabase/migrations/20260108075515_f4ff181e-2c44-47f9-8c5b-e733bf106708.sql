-- Update audit_templates SELECT policy to better support company admins
-- The "Company users can view templates in their company" already covers this via get_user_company_id
-- But let's also update "Checkers, managers and admins can view active templates" to include company roles

DROP POLICY IF EXISTS "Checkers, managers and admins can view active templates" ON public.audit_templates;

CREATE POLICY "Users can view active templates in their company"
ON public.audit_templates
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    has_role(auth.uid(), 'checker'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = audit_templates.company_id
      AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
    )
  )
);