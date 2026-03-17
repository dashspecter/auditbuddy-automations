
-- Create the missing storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-field-attachments', 'audit-field-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload audit files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-field-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view audit files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audit-field-attachments');

CREATE POLICY "Users can delete own audit files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audit-field-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
