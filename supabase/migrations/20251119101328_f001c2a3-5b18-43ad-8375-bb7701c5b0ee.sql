-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_activity_type ON public.activity_logs(activity_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
  VALUES (p_user_id, p_activity_type, p_description, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger function for audit creation
CREATE OR REPLACE FUNCTION public.log_audit_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_activity(
      NEW.user_id,
      'audit_created',
      'Created audit for ' || NEW.location,
      jsonb_build_object(
        'audit_id', NEW.id,
        'location', NEW.location,
        'status', NEW.status
      )
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if status changed to completed
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
      PERFORM public.log_activity(
        NEW.user_id,
        'audit_completed',
        'Completed audit for ' || NEW.location,
        jsonb_build_object(
          'audit_id', NEW.id,
          'location', NEW.location,
          'overall_score', NEW.overall_score
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for location audits
CREATE TRIGGER log_location_audit_activity
  AFTER INSERT OR UPDATE ON public.location_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_activity();