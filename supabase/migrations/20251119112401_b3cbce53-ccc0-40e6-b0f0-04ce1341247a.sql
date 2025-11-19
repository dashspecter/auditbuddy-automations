-- Drop all existing notification policies
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view active notifications for their role" ON public.notifications;
DROP POLICY IF EXISTS "Managers can create notifications for checkers" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Managers can view notifications" ON public.notifications;

-- Create new comprehensive policies
CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all notifications" 
ON public.notifications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all notifications" 
ON public.notifications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can create notifications for checkers" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND target_roles <@ ARRAY['checker'::text]
);

CREATE POLICY "Users can view active notifications for their role" 
ON public.notifications 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now()) 
  AND (scheduled_for IS NULL OR scheduled_for <= now()) 
  AND EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role)::text = ANY (notifications.target_roles)
  )
);