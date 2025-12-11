-- Enable realtime for location_audits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_audits;

-- Enable realtime for attendance_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable realtime for test_submissions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_submissions;