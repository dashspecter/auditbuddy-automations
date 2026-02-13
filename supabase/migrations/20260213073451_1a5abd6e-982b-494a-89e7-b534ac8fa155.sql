-- Update trigger to use the same deadline logic as the UI:
-- Priority: due_at > (start_at + duration_minutes)
-- This matches getTaskDeadline() in taskDateUtils.ts / taskOccurrenceEngine.ts
CREATE OR REPLACE FUNCTION public.calculate_task_completion_late()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline timestamptz;
BEGIN
  -- If completed_late is explicitly set by caller, respect it
  IF NEW.completed_late IS NOT NULL AND TG_OP = 'INSERT' AND NEW.completed_late != false THEN
    RETURN NEW;
  END IF;

  -- Calculate deadline using same logic as frontend getTaskDeadline():
  -- 1. If start_at + duration_minutes exist, use start_at + duration as deadline
  -- 2. Otherwise fall back to due_at
  SELECT 
    CASE
      WHEN t.start_at IS NOT NULL AND t.duration_minutes IS NOT NULL 
        THEN t.start_at + (t.duration_minutes || ' minutes')::interval
      WHEN t.due_at IS NOT NULL 
        THEN t.due_at
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

-- Backfill: recalculate completed_late for ALL existing completions using unified deadline logic
UPDATE public.task_completions tc
SET completed_late = CASE
  WHEN tc.completed_at IS NULL THEN false
  WHEN t.start_at IS NOT NULL AND t.duration_minutes IS NOT NULL 
    THEN tc.completed_at > (t.start_at + (t.duration_minutes || ' minutes')::interval)
  WHEN t.due_at IS NOT NULL 
    THEN tc.completed_at > t.due_at
  ELSE false
END
FROM public.tasks t
WHERE tc.task_id = t.id;