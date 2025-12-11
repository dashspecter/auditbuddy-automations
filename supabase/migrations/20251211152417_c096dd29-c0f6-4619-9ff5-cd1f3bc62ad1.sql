-- Update the foreign key constraint on tasks.completed_by to SET NULL on delete
-- This allows deleting employees while preserving their task history

ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_completed_by_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_completed_by_fkey
FOREIGN KEY (completed_by) REFERENCES public.employees(id)
ON DELETE SET NULL;