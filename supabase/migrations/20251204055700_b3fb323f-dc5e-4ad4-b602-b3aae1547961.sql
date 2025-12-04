-- Add overtime_rate field to employees table
ALTER TABLE public.employees
ADD COLUMN overtime_rate numeric DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.employees.overtime_rate IS 'Hourly rate for extra shifts beyond expected_shifts_per_week. If null, uses regular hourly_rate.';