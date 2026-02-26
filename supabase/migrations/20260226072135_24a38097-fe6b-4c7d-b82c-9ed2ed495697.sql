
-- Fix 3: Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Fix 4: Drop dangerous ALL policy on performance_monthly_scores
DROP POLICY IF EXISTS "Service role can manage monthly scores" ON public.performance_monthly_scores;

-- Fix 5: Drop unscoped storage policies for documents and equipment-documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload equipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view equipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete equipment documents" ON storage.objects;

-- Fix 5: Recreate with company-folder scoping

-- Documents INSERT
CREATE POLICY "Users can upload documents to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
);

-- Documents SELECT
CREATE POLICY "Users can view documents in their company folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
);

-- Documents DELETE (managers/admins only)
CREATE POLICY "Managers can delete documents in their company folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
  AND public.user_is_manager_in_company(auth.uid(), public.get_user_company_id(auth.uid()))
);

-- Equipment-documents INSERT
CREATE POLICY "Users can upload equipment docs to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipment-documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
);

-- Equipment-documents SELECT (bucket is public, but this scopes authenticated access)
CREATE POLICY "Users can view equipment docs in their company folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'equipment-documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
);

-- Equipment-documents DELETE (managers/admins only)
CREATE POLICY "Managers can delete equipment docs in their company folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'equipment-documents'
  AND (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
  AND public.user_is_manager_in_company(auth.uid(), public.get_user_company_id(auth.uid()))
);
