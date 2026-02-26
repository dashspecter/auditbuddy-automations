
-- Fix: calculate_task_completion_late trigger to use occurrence_date + time-of-day(start_at)
-- instead of raw start_at, so recurring task completions are compared against the correct day's deadline

CREATE OR REPLACE FUNCTION public.calculate_task_completion_late()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline timestamptz;
  v_tz TEXT := 'Europe/Bucharest';
BEGIN
  -- If completed_late is explicitly set by caller, respect it
  IF NEW.completed_late IS NOT NULL AND TG_OP = 'INSERT' AND NEW.completed_late != false THEN
    RETURN NEW;
  END IF;

  SELECT 
    CASE
      WHEN t.start_at IS NOT NULL AND t.duration_minutes IS NOT NULL THEN
        -- For recurring tasks: apply time-of-day from start_at to the occurrence_date
        -- This ensures Feb 5 completions are compared against Feb 5's deadline, not the original start_at date
        timezone(v_tz, (
          NEW.occurrence_date || ' ' || 
          to_char(t.start_at AT TIME ZONE v_tz, 'HH24:MI:SS')
        )::timestamp) + (t.duration_minutes || ' minutes')::interval
      WHEN t.due_at IS NOT NULL THEN t.due_at
      ELSE NULL
    END
  INTO v_deadline
  FROM public.tasks t
  WHERE t.id = NEW.task_id;

  -- If no deadline can be determined, not late
  IF v_deadline IS NULL OR NEW.completed_at IS NULL THEN
    NEW.completed_late := false;
  ELSE
    NEW.completed_late := (NEW.completed_at > v_deadline);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Backfill all existing task_completions with corrected late flag
UPDATE public.task_completions tc
SET completed_late = CASE
  WHEN tc.completed_at IS NULL THEN false
  WHEN t.start_at IS NOT NULL AND t.duration_minutes IS NOT NULL THEN
    tc.completed_at > (
      timezone('Europe/Bucharest', (
        tc.occurrence_date || ' ' || 
        to_char(t.start_at AT TIME ZONE 'Europe/Bucharest', 'HH24:MI:SS')
      )::timestamp) + (t.duration_minutes || ' minutes')::interval
    )
  WHEN t.due_at IS NOT NULL THEN
    tc.completed_at > t.due_at
  ELSE false
END
FROM public.tasks t
WHERE t.id = tc.task_id;
