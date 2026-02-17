
-- =============================================
-- ROLE TEMPLATES & POLICY RULES ENGINE
-- Additive layer - no changes to existing tables
-- =============================================

-- 1. Role Templates: predefined permission bundles
CREATE TABLE public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, name)
);

-- System templates have NULL company_id (global), company-specific ones have company_id set
CREATE INDEX idx_role_templates_company ON public.role_templates(company_id);

-- 2. Permissions assigned to each role template
CREATE TABLE public.role_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, resource, action)
);

CREATE INDEX idx_rtp_template ON public.role_template_permissions(template_id);

-- 3. Link users to role templates within a company
CREATE TABLE public.user_role_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, template_id)
);

CREATE INDEX idx_urta_company_user ON public.user_role_template_assignments(company_id, user_id);

-- 4. Policy Rules: condition-based action restrictions
CREATE TABLE public.policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('time_lock', 'state_lock', 'role_required', 'approval_required', 'custom')),
  condition_config JSONB NOT NULL DEFAULT '{}',
  enforcement TEXT NOT NULL DEFAULT 'block' CHECK (enforcement IN ('block', 'warn', 'log')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_policy_rules_company ON public.policy_rules(company_id);
CREATE INDEX idx_policy_rules_resource_action ON public.policy_rules(resource, action);

-- 5. Policy rule evaluation log (for audit trail)
CREATE TABLE public.policy_rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.policy_rules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('allowed', 'blocked', 'warned')),
  context_json JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pre_company_time ON public.policy_rule_evaluations(company_id, evaluated_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rule_evaluations ENABLE ROW LEVEL SECURITY;

-- Role templates: viewable by company members, manageable by owner/admin
CREATE POLICY "Users can view role templates for their company"
  ON public.role_templates FOR SELECT
  USING (
    is_system = true
    OR company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage role templates"
  ON public.role_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND company_role IN ('company_owner', 'company_admin')
    )
  );

-- Template permissions: same access as templates
CREATE POLICY "Users can view template permissions"
  ON public.role_template_permissions FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.role_templates 
      WHERE is_system = true
      OR company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage template permissions"
  ON public.role_template_permissions FOR ALL
  USING (
    template_id IN (
      SELECT rt.id FROM public.role_templates rt
      JOIN public.company_users cu ON cu.company_id = rt.company_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_role IN ('company_owner', 'company_admin')
    )
  );

-- Assignments: viewable by company members, manageable by owner/admin
CREATE POLICY "Users can view assignments in their company"
  ON public.user_role_template_assignments FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage assignments"
  ON public.user_role_template_assignments FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND company_role IN ('company_owner', 'company_admin')
    )
  );

-- Policy rules: viewable by company members, manageable by owner/admin
CREATE POLICY "Users can view policy rules"
  ON public.policy_rules FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage policy rules"
  ON public.policy_rules FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND company_role IN ('company_owner', 'company_admin')
    )
  );

-- Policy evaluations: viewable by owner/admin only
CREATE POLICY "Admins can view policy evaluations"
  ON public.policy_rule_evaluations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND company_role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY "System can insert evaluations"
  ON public.policy_rule_evaluations FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  );

-- =============================================
-- SEED SYSTEM ROLE TEMPLATES
-- =============================================

INSERT INTO public.role_templates (name, description, is_system, company_id) VALUES
  ('Owner', 'Full platform access. Can manage billing, users, and all settings.', true, NULL),
  ('Operations Director', 'Oversees all locations. Full access to reports, audits, and workforce.', true, NULL),
  ('Area Manager', 'Manages multiple locations. Can edit schedules, audits, and employees.', true, NULL),
  ('Store Manager', 'Manages a single location. Can manage shifts, tasks, and local staff.', true, NULL),
  ('Shift Lead', 'Leads a shift. Can view schedules, complete tasks, and submit reports.', true, NULL),
  ('Staff', 'Basic access. Can clock in/out, complete assigned tasks, and view own schedule.', true, NULL),
  ('Vendor', 'External partner. Limited access to assigned audits and documents.', true, NULL),
  ('Auditor', 'Performs audits. Can view and complete assigned audit templates.', true, NULL);

-- Seed permissions for each template
-- Owner: everything
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('employees'),('shifts'),('attendance'),('audits'),('locations'),('equipment'),('documents'),('notifications'),('reports'),('tests'),('integrations'),('company_settings'),('billing'),('users')) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('update'),('delete'),('manage'),('approve')) AS a(action)
WHERE rt.name = 'Owner' AND rt.is_system = true;

-- Operations Director: everything except billing & company_settings
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('employees'),('shifts'),('attendance'),('audits'),('locations'),('equipment'),('documents'),('notifications'),('reports'),('tests'),('integrations'),('users')) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('update'),('delete'),('manage'),('approve')) AS a(action)
WHERE rt.name = 'Operations Director' AND rt.is_system = true;

-- Area Manager: manage locations, shifts, audits, employees, reports
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('employees'),('shifts'),('attendance'),('audits'),('locations'),('equipment'),('documents'),('notifications'),('reports')) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('update'),('manage'),('approve')) AS a(action)
WHERE rt.name = 'Area Manager' AND rt.is_system = true;

-- Store Manager: manage own location
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('employees'),('shifts'),('attendance'),('audits'),('equipment'),('documents'),('notifications'),('reports')) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('update'),('manage')) AS a(action)
WHERE rt.name = 'Store Manager' AND rt.is_system = true;

-- Shift Lead: view + complete tasks
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('shifts'),('attendance'),('audits'),('reports')) AS r(resource)
CROSS JOIN (VALUES ('view')) AS a(action)
WHERE rt.name = 'Shift Lead' AND rt.is_system = true;

INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('attendance')) AS r(resource)
CROSS JOIN (VALUES ('create'),('update')) AS a(action)
WHERE rt.name = 'Shift Lead' AND rt.is_system = true;

-- Staff: minimal
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('attendance'),('shifts')) AS r(resource)
CROSS JOIN (VALUES ('view')) AS a(action)
WHERE rt.name = 'Staff' AND rt.is_system = true;

-- Vendor: audits + documents only
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('audits'),('documents')) AS r(resource)
CROSS JOIN (VALUES ('view')) AS a(action)
WHERE rt.name = 'Vendor' AND rt.is_system = true;

-- Auditor: audits full + locations view
INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('audits')) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('update')) AS a(action)
WHERE rt.name = 'Auditor' AND rt.is_system = true;

INSERT INTO public.role_template_permissions (template_id, resource, action)
SELECT rt.id, r.resource, a.action
FROM public.role_templates rt
CROSS JOIN (VALUES ('locations')) AS r(resource)
CROSS JOIN (VALUES ('view')) AS a(action)
WHERE rt.name = 'Auditor' AND rt.is_system = true;

-- Add triggers for audit logging
CREATE TRIGGER audit_role_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.role_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();

CREATE TRIGGER audit_policy_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_rules
  FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();

CREATE TRIGGER audit_user_role_template_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_template_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
