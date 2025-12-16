-- Add columns for specific day selection in recurrence
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurrence_days_of_week integer[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_days_of_month integer[] DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.tasks.recurrence_days_of_week IS 'Array of days of week (0=Sunday, 6=Saturday) for weekly recurrence';
COMMENT ON COLUMN public.tasks.recurrence_days_of_month IS 'Array of days of month (1-31) for monthly recurrence';