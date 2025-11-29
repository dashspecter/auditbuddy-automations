-- Create table for section-level responses including follow-up actions
CREATE TABLE IF NOT EXISTS public.audit_section_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.location_audits(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.audit_sections(id) ON DELETE CASCADE,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audit_id, section_id)
);

-- Enable RLS
ALTER TABLE public.audit_section_responses ENABLE ROW LEVEL SECURITY;

-- Policies for audit_section_responses
CREATE POLICY "Users can view section responses for accessible audits"
  ON public.audit_section_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_section_responses.audit_id
      AND (
        location_audits.user_id = auth.uid()
        OR has_role(auth.uid(), 'manager')
        OR has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Users can create section responses for their audits"
  ON public.audit_section_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_section_responses.audit_id
      AND location_audits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own section responses"
  ON public.audit_section_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_section_responses.audit_id
      AND location_audits.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can update section responses"
  ON public.audit_section_responses
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

-- Create index for faster lookups
CREATE INDEX idx_audit_section_responses_audit_id ON public.audit_section_responses(audit_id);
CREATE INDEX idx_audit_section_responses_section_id ON public.audit_section_responses(section_id);