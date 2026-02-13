-- Create trigger to auto-calculate completed_late on task_completion insert/update
CREATE OR REPLACE FUNCTION public.calculate_task_completion_late()
RETURNS TRIGGER AS $$
BEGIN
  -- If completed_late is not explicitly set, calculate it from due_at
  IF NEW.completed_late IS NULL THEN
    NEW.completed_late := (
      SELECT CASE
        WHEN t.due_at IS NULL THEN false
        WHEN NEW.completed_at IS NULL THEN false
        WHEN NEW.completed_at > t.due_at THEN true
        ELSE false
      END
      FROM public.tasks t
      WHERE t.id = NEW.task_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_completion_calculate_late ON public.task_completions;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER task_completion_calculate_late
BEFORE INSERT OR UPDATE ON public.task_completions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_task_completion_late();