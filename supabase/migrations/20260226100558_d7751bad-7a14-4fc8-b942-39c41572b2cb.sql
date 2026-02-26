
-- 1. Create scout_notifications table
CREATE TABLE public.scout_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID NOT NULL REFERENCES public.scouts(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.scout_jobs(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_scout_notifications_scout_id ON public.scout_notifications(scout_id);
CREATE INDEX idx_scout_notifications_unread ON public.scout_notifications(scout_id, is_read) WHERE is_read = false;
CREATE INDEX idx_scout_notifications_created ON public.scout_notifications(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.scout_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS: Scouts can SELECT their own notifications
CREATE POLICY "Scouts can view own notifications"
  ON public.scout_notifications
  FOR SELECT
  USING (scout_id = public.get_scout_id(auth.uid()));

-- 5. RLS: Scouts can UPDATE (mark read) their own notifications
CREATE POLICY "Scouts can update own notifications"
  ON public.scout_notifications
  FOR UPDATE
  USING (scout_id = public.get_scout_id(auth.uid()))
  WITH CHECK (scout_id = public.get_scout_id(auth.uid()));

-- 6. RLS: Service-level INSERT (for triggers/edge functions using service role)
-- Triggers run as SECURITY DEFINER so they bypass RLS, but edge functions
-- using service role also bypass RLS. No INSERT policy needed for scouts.

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scout_notifications;

-- 8. Trigger function: auto-notify scout on submission status change
CREATE OR REPLACE FUNCTION public.fn_notify_scout_on_submission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scout_id UUID;
  v_job_title TEXT;
  v_notif_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only fire on status change to approved or rejected
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get scout_id from the job
  SELECT sj.scout_id, sj.title INTO v_scout_id, v_job_title
  FROM public.scout_jobs sj
  WHERE sj.id = NEW.job_id;

  IF v_scout_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_notif_type := 'job_approved';
    v_title := 'Submission Approved';
    v_message := 'Your submission for "' || COALESCE(v_job_title, 'a job') || '" has been approved.';
  ELSE
    v_notif_type := 'job_rejected';
    v_title := 'Submission Rejected';
    v_message := 'Your submission for "' || COALESCE(v_job_title, 'a job') || '" was rejected. Check feedback for details.';
  END IF;

  INSERT INTO public.scout_notifications (scout_id, job_id, type, title, message)
  VALUES (v_scout_id, NEW.job_id, v_notif_type, v_title, v_message);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scout_submission_notify
  AFTER UPDATE ON public.scout_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_scout_on_submission_status();

-- 9. Trigger function: auto-notify scout on payout status change to paid
CREATE OR REPLACE FUNCTION public.fn_notify_scout_on_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job_title TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- Get job title if available
  SELECT sj.title INTO v_job_title
  FROM public.scout_jobs sj
  WHERE sj.id = NEW.job_id;

  INSERT INTO public.scout_notifications (scout_id, job_id, type, title, message)
  VALUES (
    NEW.scout_id,
    NEW.job_id,
    'payout_sent',
    'Payment Sent',
    'Payment of ' || NEW.amount || ' ' || COALESCE(NEW.currency, 'RON') || ' for "' || COALESCE(v_job_title, 'a job') || '" has been sent.'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scout_payout_notify
  AFTER UPDATE ON public.scout_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_scout_on_payout();

-- 10. Trigger function: auto-notify scout on dispute status change
CREATE OR REPLACE FUNCTION public.fn_notify_scout_on_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.scout_notifications (scout_id, job_id, type, title, message)
  VALUES (
    NEW.scout_id,
    NEW.job_id,
    'dispute_update',
    'Dispute Updated',
    'Your dispute status has been updated to "' || NEW.status || '".'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scout_dispute_notify
  AFTER UPDATE ON public.scout_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_scout_on_dispute();
