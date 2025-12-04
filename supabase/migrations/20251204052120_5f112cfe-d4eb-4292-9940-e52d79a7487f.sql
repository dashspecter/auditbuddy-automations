-- Add expected schedule fields to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS expected_weekly_hours numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expected_shifts_per_week integer DEFAULT NULL;