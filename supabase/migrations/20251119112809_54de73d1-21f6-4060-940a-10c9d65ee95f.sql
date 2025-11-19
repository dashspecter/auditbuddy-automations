-- Add audit_id column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN audit_id uuid REFERENCES public.location_audits(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_notifications_audit_id ON public.notifications(audit_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.notifications.audit_id IS 'Optional reference to a location audit that this notification is announcing';