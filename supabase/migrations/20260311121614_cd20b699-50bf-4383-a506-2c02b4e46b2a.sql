-- Phase 2A: Approval engine tables

-- 1. approval_workflows
CREATE TABLE public.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  entity_type text NOT NULL DEFAULT 'general',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read approval workflows"
  ON public.approval_workflows FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners and admins can manage approval workflows"
  ON public.approval_workflows FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  );

CREATE INDEX idx_approval_workflows_company ON public.approval_workflows(company_id);

-- 2. approval_requests
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_title text NOT NULL,
  current_step int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read approval requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Authenticated company members can create approval requests"
  ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners and admins can update approval requests"
  ON public.approval_requests FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX idx_approval_requests_company ON public.approval_requests(company_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(company_id, status);

-- 3. approval_decisions
CREATE TABLE public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  decided_by uuid NOT NULL,
  decision text NOT NULL,
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read approval decisions"
  ON public.approval_decisions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = request_id
      AND ar.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Authenticated members can insert approval decisions"
  ON public.approval_decisions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = request_id
      AND ar.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE INDEX idx_approval_decisions_request ON public.approval_decisions(request_id);