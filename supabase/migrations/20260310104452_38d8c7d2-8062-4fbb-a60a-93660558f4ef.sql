ALTER TABLE public.shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_shift_type_check 
  CHECK (shift_type = ANY (ARRAY['regular'::text, 'training'::text, 'extra'::text, 'half'::text, 'extra_half'::text]));