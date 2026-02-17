
-- Drop and recreate the manage policy to also cover system templates
DROP POLICY "Admins can manage template permissions" ON public.role_template_permissions;

CREATE POLICY "Admins can manage template permissions"
ON public.role_template_permissions
FOR ALL
USING (
  -- Company-specific templates: user must be owner/admin of that company
  (template_id IN (
    SELECT rt.id FROM role_templates rt
    JOIN company_users cu ON cu.company_id = rt.company_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin')
  ))
  OR
  -- System templates: user must be owner/admin of ANY company
  (template_id IN (
    SELECT rt.id FROM role_templates rt WHERE rt.is_system = true
  ) AND EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin')
  ))
)
WITH CHECK (
  (template_id IN (
    SELECT rt.id FROM role_templates rt
    JOIN company_users cu ON cu.company_id = rt.company_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin')
  ))
  OR
  (template_id IN (
    SELECT rt.id FROM role_templates rt WHERE rt.is_system = true
  ) AND EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin')
  ))
);
