-- Create equipment-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-documents', 'equipment-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload equipment documents
CREATE POLICY "Authenticated users can upload equipment documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to view equipment documents
CREATE POLICY "Authenticated users can view equipment documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete equipment documents
CREATE POLICY "Authenticated users can delete equipment documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-documents' AND auth.role() = 'authenticated');