-- Add execution_mode to tasks for shift-aware vs always-on tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'shift_based' 
CHECK (execution_mode IN ('shift_based', 'always_on'));

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.execution_mode IS 'shift_based: Only appears when employees are scheduled. always_on: Always appears regardless of schedule (for management tasks).';