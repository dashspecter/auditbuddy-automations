-- Add completed_late field to task_completions for per-occurrence tracking
ALTER TABLE public.task_completions
ADD COLUMN completed_late boolean DEFAULT false;

-- Add a comment documenting the field
COMMENT ON COLUMN public.task_completions.completed_late IS 'Whether this specific occurrence was completed after the due date. Defaults to false if no due_at or not determined yet.';

-- Create an index for performance when filtering by late completions
CREATE INDEX idx_task_completions_completed_late ON public.task_completions(completed_late)
WHERE completed_late = true;