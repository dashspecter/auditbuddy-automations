-- Phase 2: Operations Agent + Workforce Agent Tables
-- Only create tables that don't exist

-- 2.1.1 LocationDailyOps
CREATE TABLE IF NOT EXISTS public.location_daily_ops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  issues_found_json JSONB DEFAULT '[]'::jsonb,
  location_health_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1.2 LocationSLAConfigs
CREATE TABLE IF NOT EXISTS public.location_sla_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  sla_name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1.3 SLAEvents
CREATE TABLE IF NOT EXISTS public.sla_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  sla_config_id UUID NOT NULL REFERENCES public.location_sla_configs(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'resolved', 'acknowledged')),
  details_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1.5 MaintenanceTasks (separate from existing equipment_interventions)
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  notes TEXT,
  created_by_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.1.1 Timesheets
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  hours_worked NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  anomalies_json JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.1.3 PayrollBatches
CREATE TABLE IF NOT EXISTS public.payroll_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processed', 'paid')),
  summary_json JSONB DEFAULT '{}'::jsonb,
  created_by_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.1.4 AttendanceAlerts
CREATE TABLE IF NOT EXISTS public.attendance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  alert_type TEXT NOT NULL,
  details_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS on all new tables
ALTER TABLE public.location_daily_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_daily_ops
CREATE POLICY "Users can view daily ops in their company" ON public.location_daily_ops
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage daily ops" ON public.location_daily_ops
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for location_sla_configs
CREATE POLICY "Users can view SLA configs in their company" ON public.location_sla_configs
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage SLA configs" ON public.location_sla_configs
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner'))
  );

-- RLS Policies for sla_events
CREATE POLICY "Users can view SLA events in their company" ON public.sla_events
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert SLA events" ON public.sla_events
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for maintenance_tasks
CREATE POLICY "Users can view maintenance tasks in their company" ON public.maintenance_tasks
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage maintenance tasks" ON public.maintenance_tasks
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for timesheets
CREATE POLICY "Users can view timesheets in their company" ON public.timesheets
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage timesheets" ON public.timesheets
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Employees can view their own timesheets" ON public.timesheets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = timesheets.employee_id AND e.user_id = auth.uid())
  );

-- RLS Policies for payroll_batches
CREATE POLICY "Users can view payroll batches in their company" ON public.payroll_batches
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage payroll batches" ON public.payroll_batches
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner'))
  );

-- RLS Policies for attendance_alerts
CREATE POLICY "Users can view attendance alerts in their company" ON public.attendance_alerts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage attendance alerts" ON public.attendance_alerts
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_daily_ops_company ON public.location_daily_ops(company_id);
CREATE INDEX IF NOT EXISTS idx_location_daily_ops_location_date ON public.location_daily_ops(location_id, date);
CREATE INDEX IF NOT EXISTS idx_location_sla_configs_company ON public.location_sla_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_sla_events_company ON public.sla_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sla_events_sla_config ON public.sla_events(sla_config_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_company ON public.maintenance_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_equipment ON public.maintenance_tasks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_company ON public.timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(date);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_company ON public.payroll_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_company ON public.attendance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_employee ON public.attendance_alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_status ON public.attendance_alerts(status);

-- Triggers for updated_at
CREATE TRIGGER update_location_daily_ops_updated_at BEFORE UPDATE ON public.location_daily_ops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_location_sla_configs_updated_at BEFORE UPDATE ON public.location_sla_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_maintenance_tasks_updated_at BEFORE UPDATE ON public.maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payroll_batches_updated_at BEFORE UPDATE ON public.payroll_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();