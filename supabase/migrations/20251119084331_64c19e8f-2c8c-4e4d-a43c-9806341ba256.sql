-- Fix critical security issues

-- 1. Fix location_audits: Remove overly permissive policy and replace with proper access control
DROP POLICY IF EXISTS "Users can view all location audits" ON public.location_audits;

CREATE POLICY "Users can view their own audits and admins can view all"
  ON public.location_audits
  FOR SELECT
  USING (
    auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. Remove duplicate recursive policies on user_roles that cause infinite recursion errors
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 3. Restrict audit template visibility to authenticated users with proper roles
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.audit_templates;
DROP POLICY IF EXISTS "Anyone can view sections of active templates" ON public.audit_sections;
DROP POLICY IF EXISTS "Anyone can view fields of active templates" ON public.audit_fields;

CREATE POLICY "Auditors and admins can view active templates"
  ON public.audit_templates
  FOR SELECT
  USING (
    is_active = true AND 
    (has_role(auth.uid(), 'checker'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Auditors and admins can view sections"
  ON public.audit_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audit_templates t
      WHERE t.id = audit_sections.template_id 
      AND t.is_active = true
      AND (has_role(auth.uid(), 'checker'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Auditors and admins can view fields"
  ON public.audit_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audit_sections s
      JOIN audit_templates t ON s.template_id = t.id
      WHERE s.id = audit_fields.section_id
      AND t.is_active = true
      AND (has_role(auth.uid(), 'checker'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );