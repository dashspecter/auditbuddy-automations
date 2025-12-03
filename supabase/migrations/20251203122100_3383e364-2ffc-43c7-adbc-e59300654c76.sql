-- Add start_at and duration_minutes columns to tasks table
-- start_at: when the task becomes visible/active
-- duration_minutes: time limit to complete the task
-- The existing due_at will be calculated as start_at + duration_minutes

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS completed_late boolean DEFAULT false;

-- Add comment explaining the new timing model
COMMENT ON COLUMN public.tasks.start_at IS 'When the task becomes active/visible to employees';
COMMENT ON COLUMN public.tasks.duration_minutes IS 'Time limit in minutes to complete the task';
COMMENT ON COLUMN public.tasks.completed_late IS 'Whether the task was completed after the duration expired';