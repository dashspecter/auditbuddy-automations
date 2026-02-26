
-- Fix P0: fn_notify_scout_on_submission_status references sj.scout_id instead of sj.assigned_scout_id
CREATE OR REPLACE FUNCTION public.fn_notify_scout_on_submission_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scout_id UUID;
  v_job_title TEXT;
  v_notif_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- FIXED: was sj.scout_id, now sj.assigned_scout_id
  SELECT sj.assigned_scout_id, sj.title INTO v_scout_id, v_job_title
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
$function$;

-- P2: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_scout_disputes_scout_id ON public.scout_disputes(scout_id);
CREATE INDEX IF NOT EXISTS idx_scout_disputes_job_id ON public.scout_disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_scout_payouts_scout_id ON public.scout_payouts(scout_id);
CREATE INDEX IF NOT EXISTS idx_scout_payouts_job_id ON public.scout_payouts(job_id);
