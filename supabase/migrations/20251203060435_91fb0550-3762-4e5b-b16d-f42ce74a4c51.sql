-- Add recurrence fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_task_id uuid DEFAULT NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring_instance boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.recurrence_type IS 'none, daily, weekly, monthly';
COMMENT ON COLUMN public.tasks.recurrence_interval IS 'Every N days/weeks/months';
COMMENT ON COLUMN public.tasks.parent_task_id IS 'Reference to the original recurring task template';
COMMENT ON COLUMN public.tasks.is_recurring_instance IS 'True if this task was auto-generated from a recurring template';