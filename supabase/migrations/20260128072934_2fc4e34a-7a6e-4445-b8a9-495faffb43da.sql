-- =====================================================
-- TRAINING MODULES SYSTEM
-- Extends existing training system with day-based structure,
-- sessions, and shift integration
-- =====================================================

-- 1) Extend training_programs to support module-style training
ALTER TABLE public.training_programs 
ADD COLUMN IF NOT EXISTS target_role_id uuid REFERENCES public.employee_roles(id),
ADD COLUMN IF NOT EXISTS difficulty_level integer DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS category text;

-- 2) Training module days (day-by-day structure)
CREATE TABLE IF NOT EXISTS public.training_module_days (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
    day_number integer NOT NULL CHECK (day_number >= 1),
    title text NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(module_id, day_number)
);

-- 3) Training module day tasks (template tasks for each day)
CREATE TABLE IF NOT EXISTS public.training_module_day_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_day_id uuid NOT NULL REFERENCES public.training_module_days(id) ON DELETE CASCADE,
    task_title text NOT NULL,
    task_description text,
    requires_proof boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Training module evaluations (link to audit templates)
CREATE TABLE IF NOT EXISTS public.training_module_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
    module_day_id uuid REFERENCES public.training_module_days(id) ON DELETE CASCADE,
    audit_template_id uuid NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Training assignments (assign module to trainee)
CREATE TABLE IF NOT EXISTS public.training_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trainee_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
    trainer_employee_id uuid REFERENCES public.employees(id),
    location_id uuid REFERENCES public.locations(id),
    start_date date NOT NULL,
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'paused', 'cancelled')),
    experience_level text,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_company ON public.training_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_trainee ON public.training_assignments(trainee_employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON public.training_assignments(status);

-- 6) Training sessions (calendar events)
CREATE TABLE IF NOT EXISTS public.training_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assignment_id uuid REFERENCES public.training_assignments(id) ON DELETE SET NULL,
    module_id uuid REFERENCES public.training_programs(id),
    location_id uuid NOT NULL REFERENCES public.locations(id),
    session_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    trainer_employee_id uuid REFERENCES public.employees(id),
    title text,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON public.training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_company ON public.training_sessions(company_id);

-- 7) Training session attendees
CREATE TABLE IF NOT EXISTS public.training_session_attendees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendee_role text NOT NULL DEFAULT 'trainee' CHECK (attendee_role IN ('trainee', 'trainer', 'assistant_trainer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(session_id, employee_id)
);

-- 8) Add shift_type to shifts table for training integration
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS shift_type text NOT NULL DEFAULT 'regular' CHECK (shift_type IN ('regular', 'training')),
ADD COLUMN IF NOT EXISTS training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS training_module_id uuid REFERENCES public.training_programs(id),
ADD COLUMN IF NOT EXISTS trainer_employee_id uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS cohort_label text;

CREATE INDEX IF NOT EXISTS idx_shifts_type ON public.shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_training_session ON public.shifts(training_session_id) WHERE training_session_id IS NOT NULL;

-- 9) Training evaluations (trainer evaluates trainee)
CREATE TABLE IF NOT EXISTS public.training_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.training_sessions(id),
    module_day_id uuid REFERENCES public.training_module_days(id),
    trainee_employee_id uuid NOT NULL REFERENCES public.employees(id),
    trainer_employee_id uuid NOT NULL REFERENCES public.employees(id),
    audit_instance_id uuid REFERENCES public.location_audits(id),
    evaluation_date date NOT NULL,
    score integer,
    passed boolean,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_evaluations_assignment ON public.training_evaluations(assignment_id);

-- 10) Training generated tasks (link to task system)
CREATE TABLE IF NOT EXISTS public.training_generated_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
    module_day_id uuid NOT NULL REFERENCES public.training_module_days(id),
    template_task_id uuid NOT NULL REFERENCES public.training_module_day_tasks(id),
    task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    scheduled_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(assignment_id, template_task_id, scheduled_date)
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.training_module_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_day_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_generated_tasks ENABLE ROW LEVEL SECURITY;

-- Training module days (via company through training_programs)
CREATE POLICY "Users can view training module days for their company"
ON public.training_module_days FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_days.module_id AND cu.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage training module days"
ON public.training_module_days FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_days.module_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_days.module_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training module day tasks
CREATE POLICY "Users can view training day tasks for their company"
ON public.training_module_day_tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_module_days tmd
        JOIN public.training_programs tp ON tp.id = tmd.module_id
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tmd.id = training_module_day_tasks.module_day_id AND cu.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage training day tasks"
ON public.training_module_day_tasks FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_module_days tmd
        JOIN public.training_programs tp ON tp.id = tmd.module_id
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tmd.id = training_module_day_tasks.module_day_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.training_module_days tmd
        JOIN public.training_programs tp ON tp.id = tmd.module_id
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tmd.id = training_module_day_tasks.module_day_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training module evaluations
CREATE POLICY "Users can view training evaluations for their company"
ON public.training_module_evaluations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_evaluations.module_id AND cu.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage training evaluations templates"
ON public.training_module_evaluations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_evaluations.module_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.training_programs tp
        JOIN public.company_users cu ON cu.company_id = tp.company_id
        WHERE tp.id = training_module_evaluations.module_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training assignments
CREATE POLICY "Users can view training assignments for their company"
ON public.training_assignments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_assignments.company_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = training_assignments.trainee_employee_id AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = training_assignments.trainer_employee_id AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage training assignments"
ON public.training_assignments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_assignments.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_assignments.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training sessions
CREATE POLICY "Users can view training sessions for their company"
ON public.training_sessions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_sessions.company_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.training_session_attendees tsa
        JOIN public.employees e ON e.id = tsa.employee_id
        WHERE tsa.session_id = training_sessions.id AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage training sessions"
ON public.training_sessions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_sessions.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_sessions.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training session attendees
CREATE POLICY "Users can view session attendees"
ON public.training_session_attendees FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_sessions ts
        JOIN public.company_users cu ON cu.company_id = ts.company_id
        WHERE ts.id = training_session_attendees.session_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = training_session_attendees.employee_id AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can manage session attendees"
ON public.training_session_attendees FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_sessions ts
        JOIN public.company_users cu ON cu.company_id = ts.company_id
        WHERE ts.id = training_session_attendees.session_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.training_sessions ts
        JOIN public.company_users cu ON cu.company_id = ts.company_id
        WHERE ts.id = training_session_attendees.session_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Training evaluations results
CREATE POLICY "Users can view their own evaluations or evaluations they gave"
ON public.training_evaluations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_evaluations.company_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE (e.id = training_evaluations.trainee_employee_id OR e.id = training_evaluations.trainer_employee_id)
        AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Trainers and managers can create/update evaluations"
ON public.training_evaluations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_evaluations.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = training_evaluations.trainer_employee_id AND e.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.company_id = training_evaluations.company_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = training_evaluations.trainer_employee_id AND e.user_id = auth.uid()
    )
);

-- Training generated tasks
CREATE POLICY "Users can view their training tasks"
ON public.training_generated_tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_assignments ta
        JOIN public.company_users cu ON cu.company_id = ta.company_id
        WHERE ta.id = training_generated_tasks.assignment_id AND cu.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.training_assignments ta
        JOIN public.employees e ON e.id = ta.trainee_employee_id
        WHERE ta.id = training_generated_tasks.assignment_id AND e.user_id = auth.uid()
    )
);

CREATE POLICY "System can manage training generated tasks"
ON public.training_generated_tasks FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.training_assignments ta
        JOIN public.company_users cu ON cu.company_id = ta.company_id
        WHERE ta.id = training_generated_tasks.assignment_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.training_assignments ta
        JOIN public.company_users cu ON cu.company_id = ta.company_id
        WHERE ta.id = training_generated_tasks.assignment_id 
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.training_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER training_module_days_updated
BEFORE UPDATE ON public.training_module_days
FOR EACH ROW EXECUTE FUNCTION public.training_update_timestamp();

CREATE TRIGGER training_module_day_tasks_updated
BEFORE UPDATE ON public.training_module_day_tasks
FOR EACH ROW EXECUTE FUNCTION public.training_update_timestamp();

CREATE TRIGGER training_assignments_updated
BEFORE UPDATE ON public.training_assignments
FOR EACH ROW EXECUTE FUNCTION public.training_update_timestamp();

CREATE TRIGGER training_sessions_updated
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.training_update_timestamp();

CREATE TRIGGER training_evaluations_updated
BEFORE UPDATE ON public.training_evaluations
FOR EACH ROW EXECUTE FUNCTION public.training_update_timestamp();