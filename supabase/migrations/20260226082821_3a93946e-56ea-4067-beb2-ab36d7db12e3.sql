
-- =============================================
-- Scouts Module: Full Schema + RLS + Storage
-- =============================================

-- 1. Add 'scouts' to company_modules CHECK constraint
ALTER TABLE public.company_modules DROP CONSTRAINT IF EXISTS company_modules_module_name_check;
ALTER TABLE public.company_modules ADD CONSTRAINT company_modules_module_name_check
  CHECK (module_name = ANY (ARRAY[
    'location_audits', 'staff_performance', 'equipment_management',
    'notifications', 'reports', 'workforce', 'documents',
    'inventory', 'insights', 'integrations', 'wastage',
    'qr_forms', 'whatsapp_messaging', 'payroll', 'cmms',
    'corrective_actions', 'operations', 'scouts'
  ]));

-- 2. scouts table
CREATE TABLE public.scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  zones TEXT[] DEFAULT '{}',
  transport TEXT CHECK (transport IN ('walk','bike','car','public_transport')),
  rating NUMERIC(3,2) DEFAULT 0,
  completed_jobs_count INT DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 100,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

-- 3. scout_invites
CREATE TABLE public.scout_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_invites ENABLE ROW LEVEL SECURITY;

-- 4. scout_templates
CREATE TABLE public.scout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  estimated_duration_minutes INT NOT NULL DEFAULT 15,
  guidance_text TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_templates ENABLE ROW LEVEL SECURITY;

-- 5. scout_template_steps
CREATE TABLE public.scout_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.scout_templates(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'photo' CHECK (step_type IN ('yes_no','text','number','photo','video','checklist')),
  is_required BOOLEAN DEFAULT true,
  min_photos INT DEFAULT 0,
  min_videos INT DEFAULT 0,
  guidance_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_template_steps ENABLE ROW LEVEL SECURITY;

-- 6. scout_jobs
CREATE TABLE public.scout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.scout_templates(id),
  template_version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','accepted','in_progress','submitted','approved','rejected','paid','cancelled','expired')),
  payout_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  assigned_scout_id UUID REFERENCES public.scouts(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewer_user_id UUID REFERENCES auth.users(id),
  notes_public TEXT,
  notes_internal TEXT,
  rejection_reasons JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_jobs ENABLE ROW LEVEL SECURITY;

-- 7. scout_job_steps
CREATE TABLE public.scout_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'photo',
  is_required BOOLEAN DEFAULT true,
  min_photos INT DEFAULT 0,
  min_videos INT DEFAULT 0,
  guidance_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_job_steps ENABLE ROW LEVEL SECURITY;

-- 8. scout_submissions
CREATE TABLE public.scout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES public.scouts(id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','resubmit_required')),
  overall_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewer_user_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, scout_id)
);
ALTER TABLE public.scout_submissions ENABLE ROW LEVEL SECURITY;

-- 9. scout_step_answers
CREATE TABLE public.scout_step_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.scout_submissions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.scout_job_steps(id),
  answer_bool BOOLEAN,
  answer_text TEXT,
  answer_number NUMERIC,
  step_status TEXT DEFAULT 'pending' CHECK (step_status IN ('pending','passed','failed')),
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_step_answers ENABLE ROW LEVEL SECURITY;

-- 10. scout_media
CREATE TABLE public.scout_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.scout_submissions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.scout_job_steps(id),
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo','video')),
  mime_type TEXT,
  size_bytes BIGINT,
  captured_at TIMESTAMPTZ,
  geo_hash TEXT,
  exif_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scout_media ENABLE ROW LEVEL SECURITY;

-- 11. scout_payouts
CREATE TABLE public.scout_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES public.scouts(id),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  method TEXT DEFAULT 'manual',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);
ALTER TABLE public.scout_payouts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_scouts_user_id ON public.scouts(user_id);
CREATE INDEX idx_scouts_status ON public.scouts(status);
CREATE INDEX idx_scout_invites_token ON public.scout_invites(token);
CREATE INDEX idx_scout_invites_company ON public.scout_invites(company_id);
CREATE INDEX idx_scout_templates_company ON public.scout_templates(company_id);
CREATE INDEX idx_scout_template_steps_template ON public.scout_template_steps(template_id);
CREATE INDEX idx_scout_jobs_company ON public.scout_jobs(company_id);
CREATE INDEX idx_scout_jobs_location ON public.scout_jobs(location_id);
CREATE INDEX idx_scout_jobs_status ON public.scout_jobs(status);
CREATE INDEX idx_scout_jobs_scout ON public.scout_jobs(assigned_scout_id);
CREATE INDEX idx_scout_jobs_template ON public.scout_jobs(template_id);
CREATE INDEX idx_scout_job_steps_job ON public.scout_job_steps(job_id);
CREATE INDEX idx_scout_submissions_job ON public.scout_submissions(job_id);
CREATE INDEX idx_scout_submissions_scout ON public.scout_submissions(scout_id);
CREATE INDEX idx_scout_step_answers_submission ON public.scout_step_answers(submission_id);
CREATE INDEX idx_scout_media_submission ON public.scout_media(submission_id);
CREATE INDEX idx_scout_payouts_scout ON public.scout_payouts(scout_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper: check if user is a scout
CREATE OR REPLACE FUNCTION public.get_scout_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.scouts WHERE user_id = _user_id LIMIT 1
$$;

-- == scouts ==
CREATE POLICY "Platform admins full access to scouts"
  ON public.scouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Scouts read own record"
  ON public.scouts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Scouts update own record"
  ON public.scouts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org managers view scouts on their jobs"
  ON public.scouts FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT sj.assigned_scout_id FROM public.scout_jobs sj
      WHERE sj.company_id = public.get_user_company_id(auth.uid())
      AND sj.assigned_scout_id IS NOT NULL
    )
  );

-- == scout_invites ==
CREATE POLICY "Platform admins full access to scout_invites"
  ON public.scout_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers manage own company invites"
  ON public.scout_invites FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id));

-- == scout_templates ==
CREATE POLICY "Platform admins full access to scout_templates"
  ON public.scout_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers manage own company templates"
  ON public.scout_templates FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Scouts read active templates"
  ON public.scout_templates FOR SELECT TO authenticated
  USING (is_active = true AND public.get_scout_id(auth.uid()) IS NOT NULL);

-- == scout_template_steps ==
CREATE POLICY "Platform admins full access to scout_template_steps"
  ON public.scout_template_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers manage steps via template company"
  ON public.scout_template_steps FOR ALL TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.scout_templates
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.scout_templates
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Scouts read steps of active templates"
  ON public.scout_template_steps FOR SELECT TO authenticated
  USING (
    template_id IN (SELECT id FROM public.scout_templates WHERE is_active = true)
    AND public.get_scout_id(auth.uid()) IS NOT NULL
  );

-- == scout_jobs ==
CREATE POLICY "Platform admins full access to scout_jobs"
  ON public.scout_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers manage own company jobs"
  ON public.scout_jobs FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "Scouts read posted or assigned jobs"
  ON public.scout_jobs FOR SELECT TO authenticated
  USING (
    public.get_scout_id(auth.uid()) IS NOT NULL
    AND (status = 'posted' OR assigned_scout_id = public.get_scout_id(auth.uid()))
  );

-- == scout_job_steps ==
CREATE POLICY "Platform admins full access to scout_job_steps"
  ON public.scout_job_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers read job steps via company"
  ON public.scout_job_steps FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Scouts read steps of assigned jobs"
  ON public.scout_job_steps FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE assigned_scout_id = public.get_scout_id(auth.uid())
    )
  );

-- == scout_submissions ==
CREATE POLICY "Platform admins full access to scout_submissions"
  ON public.scout_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers read submissions for their company"
  ON public.scout_submissions FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Org managers update submissions for review"
  ON public.scout_submissions FOR UPDATE TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE company_id = public.get_user_company_id(auth.uid())
      AND public.user_is_manager_in_company(auth.uid(), company_id)
    )
  );

CREATE POLICY "Scouts insert own submissions"
  ON public.scout_submissions FOR INSERT TO authenticated
  WITH CHECK (scout_id = public.get_scout_id(auth.uid()));

CREATE POLICY "Scouts read own submissions"
  ON public.scout_submissions FOR SELECT TO authenticated
  USING (scout_id = public.get_scout_id(auth.uid()));

-- == scout_step_answers ==
CREATE POLICY "Platform admins full access to scout_step_answers"
  ON public.scout_step_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers read answers for their company"
  ON public.scout_step_answers FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT ss.id FROM public.scout_submissions ss
      JOIN public.scout_jobs sj ON sj.id = ss.job_id
      WHERE sj.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Org managers update answers for review"
  ON public.scout_step_answers FOR UPDATE TO authenticated
  USING (
    submission_id IN (
      SELECT ss.id FROM public.scout_submissions ss
      JOIN public.scout_jobs sj ON sj.id = ss.job_id
      WHERE sj.company_id = public.get_user_company_id(auth.uid())
      AND public.user_is_manager_in_company(auth.uid(), sj.company_id)
    )
  );

CREATE POLICY "Scouts insert own answers"
  ON public.scout_step_answers FOR INSERT TO authenticated
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.scout_submissions WHERE scout_id = public.get_scout_id(auth.uid())
    )
  );

CREATE POLICY "Scouts read own answers"
  ON public.scout_step_answers FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.scout_submissions WHERE scout_id = public.get_scout_id(auth.uid())
    )
  );

-- == scout_media ==
CREATE POLICY "Platform admins full access to scout_media"
  ON public.scout_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers read media for their company"
  ON public.scout_media FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT ss.id FROM public.scout_submissions ss
      JOIN public.scout_jobs sj ON sj.id = ss.job_id
      WHERE sj.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Scouts insert own media"
  ON public.scout_media FOR INSERT TO authenticated
  WITH CHECK (
    submission_id IN (
      SELECT id FROM public.scout_submissions WHERE scout_id = public.get_scout_id(auth.uid())
    )
  );

CREATE POLICY "Scouts read own media"
  ON public.scout_media FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.scout_submissions WHERE scout_id = public.get_scout_id(auth.uid())
    )
  );

-- == scout_payouts ==
CREATE POLICY "Platform admins full access to scout_payouts"
  ON public.scout_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers read payouts for their company"
  ON public.scout_payouts FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Org managers update payouts for their company"
  ON public.scout_payouts FOR UPDATE TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.scout_jobs
      WHERE company_id = public.get_user_company_id(auth.uid())
      AND public.user_is_manager_in_company(auth.uid(), company_id)
    )
  );

CREATE POLICY "Scouts read own payouts"
  ON public.scout_payouts FOR SELECT TO authenticated
  USING (scout_id = public.get_scout_id(auth.uid()));

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('scout-evidence', 'scout-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for scout-evidence bucket
CREATE POLICY "Org managers read scout evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'scout-evidence'
    AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
  );

CREATE POLICY "Scouts upload evidence to assigned jobs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scout-evidence'
    AND public.get_scout_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Scouts read own evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'scout-evidence'
    AND public.get_scout_id(auth.uid()) IS NOT NULL
  );
