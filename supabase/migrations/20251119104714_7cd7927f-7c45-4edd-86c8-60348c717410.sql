-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, announcement
  target_roles TEXT[] NOT NULL DEFAULT '{checker,manager,admin}', -- roles that should see this
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user notification reads tracking table
CREATE TABLE public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view active notifications for their role"
ON public.notifications
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = ANY(target_roles)
  )
);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can create notifications for checkers"
ON public.notifications
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
  AND target_roles <@ ARRAY['checker']::text[]
);

-- Notification reads policies
CREATE POLICY "Users can view their own notification reads"
ON public.notification_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
ON public.notification_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification reads"
ON public.notification_reads
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notifications_active ON public.notifications(is_active, expires_at);
CREATE INDEX idx_notifications_target_roles ON public.notifications USING GIN(target_roles);
CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification ON public.notification_reads(notification_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();