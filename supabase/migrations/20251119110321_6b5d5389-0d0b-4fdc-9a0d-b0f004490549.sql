-- Create notification audit logs table
CREATE TABLE public.notification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'sent', 'scheduled', 'deleted'
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  recipients_count INTEGER,
  target_roles TEXT[]
);

-- Enable RLS
ALTER TABLE public.notification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.notification_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Managers can view audit logs
CREATE POLICY "Managers can view audit logs"
ON public.notification_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.notification_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = performed_by);

-- Create indexes
CREATE INDEX idx_notification_audit_logs_notification ON public.notification_audit_logs(notification_id);
CREATE INDEX idx_notification_audit_logs_performed_by ON public.notification_audit_logs(performed_by);
CREATE INDEX idx_notification_audit_logs_performed_at ON public.notification_audit_logs(performed_at DESC);

-- Create function to log notification actions
CREATE OR REPLACE FUNCTION public.log_notification_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.notification_audit_logs (
      notification_id,
      action,
      performed_by,
      metadata,
      target_roles
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.scheduled_for IS NOT NULL AND NEW.scheduled_for > now() THEN 'scheduled'
        ELSE 'created'
      END,
      NEW.created_by,
      jsonb_build_object(
        'title', NEW.title,
        'type', NEW.type,
        'scheduled_for', NEW.scheduled_for
      ),
      NEW.target_roles
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.notification_audit_logs (
      notification_id,
      action,
      performed_by,
      metadata,
      target_roles
    ) VALUES (
      OLD.id,
      'deleted',
      auth.uid(),
      jsonb_build_object('title', OLD.title),
      OLD.target_roles
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for notification audit logging
CREATE TRIGGER notification_audit_trigger
AFTER INSERT OR DELETE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.log_notification_action();