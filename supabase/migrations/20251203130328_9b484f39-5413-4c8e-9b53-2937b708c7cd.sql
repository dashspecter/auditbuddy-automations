-- Add completed_by field to track who completed the task
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.employees(id);

-- Update the existing completed task to have a completed_by (we'll need to set this going forward)
-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON public.tasks(completed_by);