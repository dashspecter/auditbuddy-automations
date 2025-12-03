-- Add auto_clockout_delay_minutes to companies table (default 30 minutes)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS auto_clockout_delay_minutes INTEGER DEFAULT 30;

-- Add auto_clockedout flag to attendance_logs to identify auto-clocked entries
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT false;