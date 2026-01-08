-- Fix audit_field_responses SELECT policy to include company admins/owners/managers
DROP POLICY IF EXISTS "Users can view responses for accessible audits" ON public.audit_field_responses;

CREATE POLICY "Users can view responses for accessible audits"
ON public.audit_field_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM location_audits la
    WHERE la.id = audit_field_responses.audit_id
    AND (
      la.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM company_users cu
        JOIN locations l ON l.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
        AND l.id = la.location_id
      )
    )
  )
);

-- Fix audit_fields SELECT policy to include company admins/owners/managers
DROP POLICY IF EXISTS "Checkers, managers and admins can view fields" ON public.audit_fields;

CREATE POLICY "Users can view fields for accessible templates"
ON public.audit_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM audit_sections s
    JOIN audit_templates t ON s.template_id = t.id
    WHERE s.id = audit_fields.section_id
    AND t.is_active = true
    AND (
      has_role(auth.uid(), 'checker'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = t.company_id
        AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
      )
    )
  )
);

-- Fix audit_sections SELECT policy to include company admins/owners/managers
DROP POLICY IF EXISTS "Checkers, managers and admins can view sections" ON public.audit_sections;

CREATE POLICY "Users can view sections for accessible templates"
ON public.audit_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM audit_templates t
    WHERE t.id = audit_sections.template_id
    AND t.is_active = true
    AND (
      has_role(auth.uid(), 'checker'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = t.company_id
        AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
      )
    )
  )
);