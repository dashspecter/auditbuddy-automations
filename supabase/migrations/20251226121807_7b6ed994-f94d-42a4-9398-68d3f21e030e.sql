-- Add clock_in_enabled column to companies table
-- When true: employees must clock in/out, payroll uses attendance logs
-- When false: no clock in/out, payroll uses scheduled shifts

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS clock_in_enabled boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.companies.clock_in_enabled IS 'When true, employees must clock in/out. When false, scheduled shifts are used for payroll.';