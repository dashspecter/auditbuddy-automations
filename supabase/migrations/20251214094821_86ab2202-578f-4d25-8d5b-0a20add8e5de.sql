-- Enable realtime for shifts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;

-- Enable realtime for shift_assignments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_assignments;