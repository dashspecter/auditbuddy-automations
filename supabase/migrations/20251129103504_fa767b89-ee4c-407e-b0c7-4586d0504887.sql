-- Add notification email field to documents table
ALTER TABLE public.documents
ADD COLUMN notification_email text;

COMMENT ON COLUMN public.documents.notification_email IS 'Email address to notify for renewal reminders (for permits and contracts)';
