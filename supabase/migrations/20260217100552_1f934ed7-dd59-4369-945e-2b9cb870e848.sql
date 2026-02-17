
-- Update the ALL policy on form_templates to include company_manager
DROP POLICY "Admins can manage form templates" ON form_templates;

CREATE POLICY "Managers and admins can manage form templates"
ON form_templates
FOR ALL
USING (
  company_id IN (
    SELECT company_users.company_id
    FROM company_users
    WHERE company_users.user_id = auth.uid()
    AND company_users.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_users.company_id
    FROM company_users
    WHERE company_users.user_id = auth.uid()
    AND company_users.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
  )
);
