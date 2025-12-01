-- Create audits table (distinct from old location_audits)
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT audits_status_check CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled'))
);

-- Create scheduled_audits table
CREATE TABLE IF NOT EXISTS public.scheduled_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  CONSTRAINT scheduled_audits_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  CONSTRAINT scheduled_audits_frequency_check CHECK (frequency IS NULL OR frequency IN ('once', 'daily', 'weekly', 'monthly'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audits_company_id ON public.audits(company_id);
CREATE INDEX IF NOT EXISTS idx_audits_location_id ON public.audits(location_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditor_id ON public.audits(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON public.audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_audits_company_id ON public.scheduled_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_location_id ON public.scheduled_audits(location_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_assigned_to ON public.scheduled_audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_scheduled_for ON public.scheduled_audits(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_status ON public.scheduled_audits(status);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audits table
CREATE POLICY "Users can view audits in their company"
  ON public.audits FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create audits in their company"
  ON public.audits FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update their own audits"
  ON public.audits FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (auditor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Managers can delete audits"
  ON public.audits FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- RLS Policies for scheduled_audits table
CREATE POLICY "Users can view scheduled audits in their company"
  ON public.scheduled_audits FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can create scheduled audits"
  ON public.scheduled_audits FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Managers can update scheduled audits"
  ON public.scheduled_audits FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Managers can delete scheduled audits"
  ON public.scheduled_audits FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );