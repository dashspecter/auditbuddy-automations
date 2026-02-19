
-- Add recurrence_times array to tasks (stores multiple HH:MM strings like ['08:00','12:00','18:00'])
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_times TEXT[];

-- Add scheduled_time to task_completions to allow per-slot tracking
ALTER TABLE public.task_completions
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Drop old unique constraint if it exists
ALTER TABLE public.task_completions
  DROP CONSTRAINT IF EXISTS task_completions_task_id_occurrence_date_key;

-- Add new unique constraint: one completion per task per day per time slot
-- When scheduled_time IS NULL (single-time tasks), use COALESCE to treat NULL as '00:00'
CREATE UNIQUE INDEX IF NOT EXISTS task_completions_unique_slot
  ON public.task_completions (task_id, occurrence_date, COALESCE(scheduled_time, '00:00'));
