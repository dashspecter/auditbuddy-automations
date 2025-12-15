-- Add is_individual column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_individual boolean NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.tasks.is_individual IS 'When true, each employee must complete the task individually. When false (default), the task is shared and only needs to be completed once.';