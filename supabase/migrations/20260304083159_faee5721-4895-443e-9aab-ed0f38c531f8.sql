
-- Fix audit_sections RLS: allow company owners/admins/managers
DROP POLICY IF EXISTS "Managers can manage sections" ON public.audit_sections;
CREATE POLICY "Managers can manage sections" ON public.audit_sections
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.audit_templates t
      JOIN public.company_users cu ON cu.company_id = t.company_id
      WHERE t.id = audit_sections.template_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.audit_templates t
      JOIN public.company_users cu ON cu.company_id = t.company_id
      WHERE t.id = audit_sections.template_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );

-- Fix audit_fields RLS: allow company owners/admins/managers (join through sections → templates)
DROP POLICY IF EXISTS "Managers can manage fields" ON public.audit_fields;
CREATE POLICY "Managers can manage fields" ON public.audit_fields
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.audit_sections s
      JOIN public.audit_templates t ON t.id = s.template_id
      JOIN public.company_users cu ON cu.company_id = t.company_id
      WHERE s.id = audit_fields.section_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.audit_sections s
      JOIN public.audit_templates t ON t.id = s.template_id
      JOIN public.company_users cu ON cu.company_id = t.company_id
      WHERE s.id = audit_fields.section_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );
