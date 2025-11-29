-- Create storage bucket for audit field attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-field-attachments', 'audit-field-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for audit field responses with observations and attachments
CREATE TABLE IF NOT EXISTS public.audit_field_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.location_audits(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.audit_fields(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.audit_sections(id) ON DELETE CASCADE,
  response_value JSONB,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(audit_id, field_id)
);

-- Create table for field photos
CREATE TABLE IF NOT EXISTS public.audit_field_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_response_id UUID NOT NULL REFERENCES public.audit_field_responses(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for field attachments
CREATE TABLE IF NOT EXISTS public.audit_field_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_response_id UUID NOT NULL REFERENCES public.audit_field_responses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_field_responses_audit_id ON public.audit_field_responses(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_field_responses_field_id ON public.audit_field_responses(field_id);
CREATE INDEX IF NOT EXISTS idx_audit_field_photos_response_id ON public.audit_field_photos(field_response_id);
CREATE INDEX IF NOT EXISTS idx_audit_field_attachments_response_id ON public.audit_field_attachments(field_response_id);

-- Add updated_at trigger
CREATE TRIGGER handle_audit_field_responses_updated_at
  BEFORE UPDATE ON public.audit_field_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.audit_field_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_field_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_field_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_field_responses
CREATE POLICY "Users can view responses for accessible audits"
  ON public.audit_field_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_field_responses.audit_id
      AND (
        location_audits.user_id = auth.uid()
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Users can create responses for their audits"
  ON public.audit_field_responses FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_field_responses.audit_id
      AND location_audits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own responses"
  ON public.audit_field_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.location_audits
      WHERE location_audits.id = audit_field_responses.audit_id
      AND location_audits.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can update responses"
  ON public.audit_field_responses FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS policies for audit_field_photos
CREATE POLICY "Users can view photos for accessible responses"
  ON public.audit_field_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_field_responses afr
      JOIN public.location_audits la ON la.id = afr.audit_id
      WHERE afr.id = audit_field_photos.field_response_id
      AND (
        la.user_id = auth.uid()
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Users can add photos to their responses"
  ON public.audit_field_photos FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.audit_field_responses afr
      JOIN public.location_audits la ON la.id = afr.audit_id
      WHERE afr.id = audit_field_photos.field_response_id
      AND la.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON public.audit_field_photos FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins and managers can delete photos"
  ON public.audit_field_photos FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS policies for audit_field_attachments
CREATE POLICY "Users can view attachments for accessible responses"
  ON public.audit_field_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_field_responses afr
      JOIN public.location_audits la ON la.id = afr.audit_id
      WHERE afr.id = audit_field_attachments.field_response_id
      AND (
        la.user_id = auth.uid()
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Users can add attachments to their responses"
  ON public.audit_field_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.audit_field_responses afr
      JOIN public.location_audits la ON la.id = afr.audit_id
      WHERE afr.id = audit_field_attachments.field_response_id
      AND la.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON public.audit_field_attachments FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins and managers can delete attachments"
  ON public.audit_field_attachments FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Storage policies for audit-field-attachments bucket
CREATE POLICY "Users can view attachments in their audits"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audit-field-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users can upload attachments to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audit-field-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'audit-field-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audit-field-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );