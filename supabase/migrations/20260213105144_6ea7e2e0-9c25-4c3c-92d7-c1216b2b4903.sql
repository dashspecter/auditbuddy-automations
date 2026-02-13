
ALTER TABLE public.shifts
DROP CONSTRAINT shifts_training_module_id_fkey,
ADD CONSTRAINT shifts_training_module_id_fkey
  FOREIGN KEY (training_module_id) REFERENCES public.training_programs(id) ON DELETE CASCADE;
