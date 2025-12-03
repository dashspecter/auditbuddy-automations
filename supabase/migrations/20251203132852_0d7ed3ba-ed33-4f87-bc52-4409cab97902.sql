-- Add late tracking to attendance_logs
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_clock_in TIME;

-- Add index for late tracking queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_is_late ON public.attendance_logs(is_late) WHERE is_late = true;