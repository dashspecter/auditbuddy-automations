
-- Add unique constraint on shift_assignments for (shift_id, staff_id) to enable upsert
-- This is required for training shift assignment logic to be idempotent

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_shift_staff_unique 
ON public.shift_assignments(shift_id, staff_id);

-- Backfill shift_assignments for existing training shifts that were created before this patch
-- Find all training shifts and ensure their attendees have shift assignments

-- Step 1: Insert trainer assignments for training shifts that are missing them
INSERT INTO public.shift_assignments (shift_id, staff_id, status, assigned_by, approval_status)
SELECT 
  s.id AS shift_id,
  s.trainer_employee_id AS staff_id,
  'assigned' AS status,
  s.created_by AS assigned_by,
  'approved' AS approval_status
FROM public.shifts s
WHERE s.shift_type = 'training'
  AND s.trainer_employee_id IS NOT NULL
  AND s.training_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shift_assignments sa 
    WHERE sa.shift_id = s.id AND sa.staff_id = s.trainer_employee_id
  )
ON CONFLICT (shift_id, staff_id) DO NOTHING;

-- Step 2: Insert trainee assignments from training_session_attendees
INSERT INTO public.shift_assignments (shift_id, staff_id, status, assigned_by, approval_status)
SELECT 
  s.id AS shift_id,
  tsa.employee_id AS staff_id,
  'assigned' AS status,
  s.created_by AS assigned_by,
  'approved' AS approval_status
FROM public.shifts s
JOIN public.training_sessions ts ON ts.id = s.training_session_id
JOIN public.training_session_attendees tsa ON tsa.session_id = ts.id
WHERE s.shift_type = 'training'
  AND s.training_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shift_assignments sa 
    WHERE sa.shift_id = s.id AND sa.staff_id = tsa.employee_id
  )
ON CONFLICT (shift_id, staff_id) DO NOTHING;

-- Add index on training_generated_tasks for fast lookups by task_id
CREATE INDEX IF NOT EXISTS idx_training_generated_tasks_task_id 
ON public.training_generated_tasks(task_id);

-- Add index for finding training shifts by employee
CREATE INDEX IF NOT EXISTS idx_shift_assignments_staff_id 
ON public.shift_assignments(staff_id);
