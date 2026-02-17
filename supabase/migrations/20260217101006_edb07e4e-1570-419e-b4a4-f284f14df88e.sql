
-- Update policy to also check user_roles for manager role
DROP POLICY "Managers and admins can manage form templates" ON form_templates;

CREATE POLICY "Managers and admins can manage form templates"
ON form_templates
FOR ALL
USING (
  company_id IN (
    SELECT cu.company_id
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);
