-- Make documents bucket public so templates can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'documents';