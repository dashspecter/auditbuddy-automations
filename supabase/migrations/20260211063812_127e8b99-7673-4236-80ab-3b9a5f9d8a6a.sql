-- Set default lock_mode to 'scheduled' for all new tasks
ALTER TABLE public.tasks ALTER COLUMN lock_mode SET DEFAULT 'scheduled';