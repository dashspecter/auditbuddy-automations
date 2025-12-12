-- Allow public uploads to public-assets bucket for mystery shopper photos
CREATE POLICY "Allow public uploads to public-assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'public-assets');

-- Allow public to read from public-assets bucket
CREATE POLICY "Allow public read from public-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public-assets');