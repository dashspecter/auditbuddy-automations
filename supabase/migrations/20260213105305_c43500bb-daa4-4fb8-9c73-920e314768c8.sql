
ALTER TABLE public.training_assignments
DROP CONSTRAINT training_assignments_module_id_fkey,
ADD CONSTRAINT training_assignments_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.training_programs(id) ON DELETE CASCADE;
