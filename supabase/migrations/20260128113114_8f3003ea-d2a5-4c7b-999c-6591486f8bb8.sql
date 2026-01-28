-- Step 1: Add FK constraint to training_evaluations for audit_instance_id if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'training_evaluations_audit_instance_id_fkey'
  ) THEN
    ALTER TABLE public.training_evaluations 
    ADD CONSTRAINT training_evaluations_audit_instance_id_fkey 
    FOREIGN KEY (audit_instance_id) REFERENCES public.location_audits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_company_date ON public.training_sessions(company_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_session_attendees_employee ON public.training_session_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_type ON public.shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_training_session_id ON public.shifts(training_session_id) WHERE training_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_generated_tasks_trainee ON public.training_generated_tasks(assignment_id, scheduled_date);

-- Step 3: Tighten RLS on training_evaluations
DROP POLICY IF EXISTS "Company users can read training evaluations" ON public.training_evaluations;
DROP POLICY IF EXISTS "training_evaluations_read" ON public.training_evaluations;
DROP POLICY IF EXISTS "Admins can manage training evaluations" ON public.training_evaluations;
DROP POLICY IF EXISTS "Trainers can manage their evaluations" ON public.training_evaluations;
DROP POLICY IF EXISTS "Trainees can view their evaluations" ON public.training_evaluations;

-- Admins/managers can see all evaluations for their company (using company_role column)
CREATE POLICY "Admins can manage training evaluations" 
ON public.training_evaluations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = training_evaluations.company_id
    AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
  )
);

-- Trainers can view/create evaluations they are assigned to
CREATE POLICY "Trainers can manage their evaluations" 
ON public.training_evaluations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.id = training_evaluations.trainer_employee_id
  )
);

-- Trainees can view their own evaluations (read only)
CREATE POLICY "Trainees can view their evaluations" 
ON public.training_evaluations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.id = training_evaluations.trainee_employee_id
  )
);