-- Create audit_revisions table to track all changes to audits
CREATE TABLE IF NOT EXISTS public.audit_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.location_audits(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revision_number INTEGER NOT NULL,
  changes JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_revisions_audit_id ON public.audit_revisions(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_revisions_changed_by ON public.audit_revisions(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_revisions_changed_at ON public.audit_revisions(changed_at DESC);

-- Enable RLS
ALTER TABLE public.audit_revisions ENABLE ROW LEVEL SECURITY;

-- Allow users to view revisions for audits they can view
CREATE POLICY "Users can view revisions for accessible audits"
ON public.audit_revisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.location_audits
    WHERE location_audits.id = audit_revisions.audit_id
    AND (
      location_audits.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow authenticated users to create revisions (will be created when editing audits)
CREATE POLICY "Authenticated users can create revisions"
ON public.audit_revisions FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Function to automatically increment revision number
CREATE OR REPLACE FUNCTION public.get_next_revision_number(p_audit_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_revision INTEGER;
BEGIN
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO v_max_revision
  FROM public.audit_revisions
  WHERE audit_id = p_audit_id;
  
  RETURN v_max_revision;
END;
$$;