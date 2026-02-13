-- Populate completed_late for existing task_completions based on parent task due_at
UPDATE public.task_completions tc
SET completed_late = CASE
  WHEN t.due_at IS NULL THEN false  -- No due date = not late
  WHEN tc.completed_at IS NULL THEN false  -- Not completed yet
  WHEN tc.completed_at > t.due_at THEN true  -- Late
  ELSE false  -- On time
END
FROM public.tasks t
WHERE tc.task_id = t.id
  AND tc.completed_late IS NULL;  -- Only update records where completed_late wasn't explicitly set