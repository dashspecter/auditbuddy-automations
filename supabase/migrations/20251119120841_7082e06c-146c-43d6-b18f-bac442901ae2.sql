-- Add updated_at field to notifications table and set up trigger
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger for automatic updated_at updates on notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add snoozed_until field to notification_reads to allow users to dismiss notifications for a period
ALTER TABLE public.notification_reads
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when checking snoozed notifications
CREATE INDEX IF NOT EXISTS idx_notification_reads_snoozed 
ON public.notification_reads(user_id, notification_id, snoozed_until)
WHERE snoozed_until IS NOT NULL;

-- Update the RLS policy for viewing notifications to exclude snoozed ones
DROP POLICY IF EXISTS "Users can view active notifications for their role" ON public.notifications;

CREATE POLICY "Users can view active notifications for their role"
ON public.notifications
FOR SELECT
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (scheduled_for IS NULL OR scheduled_for <= now())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role::text = ANY(target_roles)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_reads
    WHERE notification_reads.notification_id = notifications.id
    AND notification_reads.user_id = auth.uid()
    AND notification_reads.snoozed_until IS NOT NULL
    AND notification_reads.snoozed_until > now()
  )
);