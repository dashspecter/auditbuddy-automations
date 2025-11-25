-- Create audit_photos table to store photo evidence
CREATE TABLE public.audit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.location_audits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_photos ENABLE ROW LEVEL SECURITY;

-- Users can view photos for audits they have access to
CREATE POLICY "Users can view photos for accessible audits"
ON public.audit_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.location_audits
    WHERE location_audits.id = audit_photos.audit_id
    AND (
      location_audits.user_id = auth.uid()
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Users can insert photos for their own audits
CREATE POLICY "Users can add photos to their audits"
ON public.audit_photos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.location_audits
    WHERE location_audits.id = audit_photos.audit_id
    AND location_audits.user_id = auth.uid()
  )
);

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
ON public.audit_photos
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON public.audit_photos
FOR DELETE
USING (auth.uid() = user_id);

-- Admins and managers can delete any photos
CREATE POLICY "Admins and managers can delete photos"
ON public.audit_photos
FOR DELETE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create updated_at trigger
CREATE TRIGGER handle_audit_photos_updated_at
BEFORE UPDATE ON public.audit_photos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_audit_photos_audit_id ON public.audit_photos(audit_id);
CREATE INDEX idx_audit_photos_user_id ON public.audit_photos(user_id);