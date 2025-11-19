-- Update RLS policies for the new manager role

-- Audit Templates: Managers can create and manage templates
DROP POLICY IF EXISTS "Managers can manage templates" ON public.audit_templates;
CREATE POLICY "Managers can manage templates"
ON public.audit_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Update existing policy for viewing templates
DROP POLICY IF EXISTS "Auditors and admins can view active templates" ON public.audit_templates;
CREATE POLICY "Checkers, managers and admins can view active templates"
ON public.audit_templates
FOR SELECT
TO authenticated
USING (
  (is_active = true) AND 
  (has_role(auth.uid(), 'checker') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
);

-- Audit Sections: Managers can manage sections
DROP POLICY IF EXISTS "Managers can manage sections" ON public.audit_sections;
CREATE POLICY "Managers can manage sections"
ON public.audit_sections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Update existing policy for viewing sections
DROP POLICY IF EXISTS "Auditors and admins can view sections" ON public.audit_sections;
CREATE POLICY "Checkers, managers and admins can view sections"
ON public.audit_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM audit_templates t
    WHERE t.id = audit_sections.template_id
    AND t.is_active = true
    AND (has_role(auth.uid(), 'checker') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
  )
);

-- Audit Fields: Managers can manage fields
DROP POLICY IF EXISTS "Managers can manage fields" ON public.audit_fields;
CREATE POLICY "Managers can manage fields"
ON public.audit_fields
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Update existing policy for viewing fields
DROP POLICY IF EXISTS "Auditors and admins can view fields" ON public.audit_fields;
CREATE POLICY "Checkers, managers and admins can view fields"
ON public.audit_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM audit_sections s
    JOIN audit_templates t ON s.template_id = t.id
    WHERE s.id = audit_fields.section_id
    AND t.is_active = true
    AND (has_role(auth.uid(), 'checker') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
  )
);

-- Location Audits: Update policies for manager role
DROP POLICY IF EXISTS "Users can view their own audits and admins can view all" ON public.location_audits;
CREATE POLICY "Users can view audits based on role"
ON public.location_audits
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin')
);

-- Managers can update all audits
DROP POLICY IF EXISTS "Managers can update all location audits" ON public.location_audits;
CREATE POLICY "Managers can update all location audits"
ON public.location_audits
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Managers can delete audits
DROP POLICY IF EXISTS "Managers can delete location audits" ON public.location_audits;
CREATE POLICY "Managers can delete location audits"
ON public.location_audits
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- User Roles: Managers can assign checker role only
DROP POLICY IF EXISTS "Managers can assign checker roles" ON public.user_roles;
CREATE POLICY "Managers can assign checker roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'manager') AND role = 'checker') OR
  has_role(auth.uid(), 'admin')
);

-- Managers can view user roles
DROP POLICY IF EXISTS "Managers can view user roles" ON public.user_roles;
CREATE POLICY "Managers can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Managers can delete checker roles only
DROP POLICY IF EXISTS "Managers can delete checker roles" ON public.user_roles;
CREATE POLICY "Managers can delete checker roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'manager') AND role = 'checker') OR
  has_role(auth.uid(), 'admin')
);

-- Profiles: Managers can view all profiles
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));