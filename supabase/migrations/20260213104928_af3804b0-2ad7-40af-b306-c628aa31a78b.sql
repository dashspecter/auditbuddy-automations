
ALTER TABLE public.training_sessions
DROP CONSTRAINT training_sessions_module_id_fkey,
ADD CONSTRAINT training_sessions_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.training_programs(id) ON DELETE CASCADE;
