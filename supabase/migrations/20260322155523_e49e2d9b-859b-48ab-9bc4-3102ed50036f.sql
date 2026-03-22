-- Fix documents RLS: Replace overly permissive SELECT policy with company-scoped one
DROP POLICY IF EXISTS "All authenticated users can view documents" ON public.documents;

CREATE POLICY "Users can view documents in their company"
ON public.documents
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

-- Create storage bucket for Dash file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('dash-uploads', 'dash-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dash-uploads bucket
CREATE POLICY "Users can upload to their company folder in dash-uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dash-uploads'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

CREATE POLICY "Users can view their company files in dash-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dash-uploads'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);