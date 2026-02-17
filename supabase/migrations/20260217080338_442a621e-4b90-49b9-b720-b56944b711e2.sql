
-- ============================================================
-- QR Forms (HACCP / Quality Records) Module
-- New tables: form_templates, form_template_versions,
--   location_form_templates, form_submissions, form_submission_audit
-- ============================================================

-- 1) form_templates
CREATE TABLE public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  type text NOT NULL CHECK (type IN ('monthly_grid','event_log')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

CREATE INDEX idx_form_templates_company ON public.form_templates(company_id);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view form templates"
  ON public.form_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage form templates"
  ON public.form_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  );

-- 2) form_template_versions
CREATE TABLE public.form_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(template_id, version)
);

CREATE INDEX idx_ftv_template ON public.form_template_versions(template_id);

ALTER TABLE public.form_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view template versions"
  ON public.form_template_versions FOR SELECT
  USING (
    template_id IN (
      SELECT ft.id FROM public.form_templates ft
      JOIN public.company_users cu ON cu.company_id = ft.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage template versions"
  ON public.form_template_versions FOR ALL
  USING (
    template_id IN (
      SELECT ft.id FROM public.form_templates ft
      JOIN public.company_users cu ON cu.company_id = ft.company_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_role IN ('company_owner','company_admin')
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT ft.id FROM public.form_templates ft
      JOIN public.company_users cu ON cu.company_id = ft.company_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_role IN ('company_owner','company_admin')
    )
  );

-- 3) location_form_templates (assignment + QR token)
CREATE TABLE public.location_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  template_version_id uuid NOT NULL REFERENCES public.form_template_versions(id),
  overrides jsonb DEFAULT '{}'::jsonb,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

CREATE INDEX idx_lft_company ON public.location_form_templates(company_id);
CREATE INDEX idx_lft_location ON public.location_form_templates(location_id);
CREATE INDEX idx_lft_token ON public.location_form_templates(public_token);

ALTER TABLE public.location_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view location form assignments"
  ON public.location_form_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage location form assignments"
  ON public.location_form_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  );

-- 4) form_submissions
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  location_form_template_id uuid NOT NULL REFERENCES public.location_form_templates(id),
  template_id uuid NOT NULL REFERENCES public.form_templates(id),
  template_version_id uuid NOT NULL REFERENCES public.form_template_versions(id),
  period_year int,
  period_month int CHECK (period_month IS NULL OR (period_month >= 1 AND period_month <= 12)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','locked')),
  submitted_by uuid NOT NULL,
  submitted_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fs_company ON public.form_submissions(company_id);
CREATE INDEX idx_fs_location ON public.form_submissions(location_id);
CREATE INDEX idx_fs_lft ON public.form_submissions(location_form_template_id);
CREATE INDEX idx_fs_period ON public.form_submissions(period_year, period_month);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view submissions"
  ON public.form_submissions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    submitted_by = auth.uid()
  );

CREATE POLICY "Staff can create submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = auth.uid()
        AND e.company_id = company_id
      )
    )
  );

CREATE POLICY "Staff can update own draft submissions"
  ON public.form_submissions FOR UPDATE
  USING (
    submitted_by = auth.uid() AND status = 'draft'
  )
  WITH CHECK (
    submitted_by = auth.uid()
  );

CREATE POLICY "Admins can manage all submissions"
  ON public.form_submissions FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
      AND company_role IN ('company_owner','company_admin')
    )
  );

-- 5) form_submission_audit (immutable trail)
CREATE TABLE public.form_submission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  action text NOT NULL,
  path text,
  old_value jsonb,
  new_value jsonb,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fsa_submission ON public.form_submission_audit(submission_id);

ALTER TABLE public.form_submission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view audit trail"
  ON public.form_submission_audit FOR SELECT
  USING (
    submission_id IN (
      SELECT fs.id FROM public.form_submissions fs
      JOIN public.company_users cu ON cu.company_id = fs.company_id
      WHERE cu.user_id = auth.uid()
    )
    OR
    actor_id = auth.uid()
  );

CREATE POLICY "System can insert audit entries"
  ON public.form_submission_audit FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- Updated_at trigger for submissions
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for form_templates
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
