-- Create task_completions table for per-occurrence completion tracking
-- This table enables recurring tasks to be completed independently per date

CREATE TABLE IF NOT EXISTS public.task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  completed_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_mode TEXT NOT NULL DEFAULT 'on_time', -- 'early', 'on_time', 'late', 'override'
  completion_reason TEXT,
  completion_photo_url TEXT,
  overridden_by_user_id UUID,
  overridden_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups by task and date
CREATE INDEX IF NOT EXISTS idx_task_completions_task_date 
  ON public.task_completions(task_id, occurrence_date);

-- Create index for employee lookups (for Champions leaderboard)
CREATE INDEX IF NOT EXISTS idx_task_completions_employee 
  ON public.task_completions(completed_by_employee_id, occurrence_date);

-- Unique constraint: only one completion per task occurrence (for shared tasks)
-- For individual tasks, the RPC handles checking per-employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_unique_occurrence
  ON public.task_completions(task_id, occurrence_date)
  WHERE completed_by_employee_id IS NULL;

-- For individual tasks: unique per employee per occurrence
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_unique_individual
  ON public.task_completions(task_id, occurrence_date, completed_by_employee_id)
  WHERE completed_by_employee_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow employees to view/create completions for their company's tasks
CREATE POLICY "Employees can view completions for company tasks"
  ON public.task_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.employees e ON e.company_id = t.company_id
      WHERE t.id = task_completions.task_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create completions for company tasks"
  ON public.task_completions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.employees e ON e.company_id = t.company_id
      WHERE t.id = task_completions.task_id
        AND e.user_id = auth.uid()
    )
  );

-- Allow employees to update their own completions (for photo uploads, etc.)
CREATE POLICY "Employees can update their own completions"
  ON public.task_completions
  FOR UPDATE
  USING (
    completed_by_employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Realtime for task completions (for live updates on kiosk/dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;