-- Add storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);