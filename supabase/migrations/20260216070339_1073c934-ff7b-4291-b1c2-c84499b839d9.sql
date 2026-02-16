
-- Phase 1: Performance Indexes for Scale

-- location_audits
CREATE INDEX IF NOT EXISTS idx_location_audits_company_location_date 
  ON public.location_audits (company_id, location_id, audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_location_audits_assigned_user 
  ON public.location_audits (assigned_user_id, audit_date DESC) 
  WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_audits_template 
  ON public.location_audits (template_id, audit_date DESC);

-- audit_field_responses
CREATE INDEX IF NOT EXISTS idx_audit_field_responses_audit_section 
  ON public.audit_field_responses (audit_id, section_id);

-- attendance_logs
CREATE INDEX IF NOT EXISTS idx_attendance_logs_staff_checkin 
  ON public.attendance_logs (staff_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_location_checkin 
  ON public.attendance_logs (location_id, check_in_at DESC);

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_company_status 
  ON public.employees (company_id, status);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_company_status 
  ON public.tasks (company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_location_due 
  ON public.tasks (location_id, due_at DESC) 
  WHERE location_id IS NOT NULL;

-- task_completions
CREATE INDEX IF NOT EXISTS idx_task_completions_task_date 
  ON public.task_completions (task_id, occurrence_date);

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_location_date 
  ON public.shifts (location_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_company_date 
  ON public.shifts (company_id, shift_date DESC);

-- company_users
CREATE INDEX IF NOT EXISTS idx_company_users_user_company 
  ON public.company_users (user_id, company_id);

-- recurring_audit_schedules
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_active 
  ON public.recurring_audit_schedules (is_active, location_id) 
  WHERE is_active = true;
