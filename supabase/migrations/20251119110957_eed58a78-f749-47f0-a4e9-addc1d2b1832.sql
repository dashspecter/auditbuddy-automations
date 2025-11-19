-- Add recurrence fields to notifications table
ALTER TABLE public.notifications 
ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly')),
ADD COLUMN recurrence_enabled BOOLEAN DEFAULT false,
ADD COLUMN last_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Set default values for existing notifications
UPDATE public.notifications 
SET recurrence_pattern = 'none', 
    recurrence_enabled = false 
WHERE recurrence_pattern IS NULL;

-- Make recurrence_pattern not null after setting defaults
ALTER TABLE public.notifications 
ALTER COLUMN recurrence_pattern SET DEFAULT 'none',
ALTER COLUMN recurrence_pattern SET NOT NULL;

-- Create index for efficient querying of recurring notifications
CREATE INDEX idx_notifications_recurrence ON public.notifications(recurrence_enabled, next_scheduled_at) 
WHERE recurrence_enabled = true;

-- Create a view for notification analytics
CREATE OR REPLACE VIEW public.notification_analytics AS
SELECT 
  n.id,
  n.title,
  n.type,
  n.target_roles,
  n.created_at,
  n.recurrence_pattern,
  COUNT(DISTINCT nr.user_id) as read_count,
  (
    SELECT COUNT(DISTINCT ur.user_id)
    FROM public.user_roles ur
    WHERE ur.role::text = ANY(n.target_roles)
  ) as total_recipients,
  CASE 
    WHEN (
      SELECT COUNT(DISTINCT ur.user_id)
      FROM public.user_roles ur
      WHERE ur.role::text = ANY(n.target_roles)
    ) > 0 THEN
      ROUND(
        (COUNT(DISTINCT nr.user_id)::numeric / (
          SELECT COUNT(DISTINCT ur.user_id)
          FROM public.user_roles ur
          WHERE ur.role::text = ANY(n.target_roles)
        )::numeric) * 100, 
        2
      )
    ELSE 0
  END as read_rate_percentage
FROM public.notifications n
LEFT JOIN public.notification_reads nr ON n.id = nr.notification_id
GROUP BY n.id, n.title, n.type, n.target_roles, n.created_at, n.recurrence_pattern;

-- Grant access to the view
GRANT SELECT ON public.notification_analytics TO authenticated;

-- Create RLS policy for the analytics view
ALTER VIEW public.notification_analytics SET (security_invoker = on);

-- Add comment to explain the view
COMMENT ON VIEW public.notification_analytics IS 'Analytics view showing notification engagement metrics including read rates and recipient counts';