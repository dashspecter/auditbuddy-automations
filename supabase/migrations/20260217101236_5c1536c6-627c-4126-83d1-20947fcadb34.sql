
-- Fix form_template_versions: allow managers (checkbox role) too
DROP POLICY "Admins can manage template versions" ON form_template_versions;
CREATE POLICY "Managers and admins can manage template versions"
ON form_template_versions FOR ALL
USING (
  template_id IN (
    SELECT ft.id FROM form_templates ft
    JOIN company_users cu ON cu.company_id = ft.company_id
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
)
WITH CHECK (
  template_id IN (
    SELECT ft.id FROM form_templates ft
    JOIN company_users cu ON cu.company_id = ft.company_id
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

-- Fix form_categories
DROP POLICY "Admins can manage form categories" ON form_categories;
CREATE POLICY "Managers and admins can manage form categories"
ON form_categories FOR ALL
USING (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

-- Fix form_submissions
DROP POLICY "Admins can manage all submissions" ON form_submissions;
CREATE POLICY "Managers and admins can manage all submissions"
ON form_submissions FOR ALL
USING (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);

-- Fix location_form_templates
DROP POLICY "Admins can manage location form assignments" ON location_form_templates;
CREATE POLICY "Managers and admins can manage location form assignments"
ON location_form_templates FOR ALL
USING (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND (
      cu.company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text])
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);
