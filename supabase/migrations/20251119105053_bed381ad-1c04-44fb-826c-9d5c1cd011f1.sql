-- Add scheduled_for column to notifications table
ALTER TABLE public.notifications
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;

-- Update the RLS policy to check scheduled_for
DROP POLICY IF EXISTS "Users can view active notifications for their role" ON public.notifications;

CREATE POLICY "Users can view active notifications for their role"
ON public.notifications
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (scheduled_for IS NULL OR scheduled_for <= now())
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = ANY(target_roles)
  )
);

-- Create index for performance on scheduled queries
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;