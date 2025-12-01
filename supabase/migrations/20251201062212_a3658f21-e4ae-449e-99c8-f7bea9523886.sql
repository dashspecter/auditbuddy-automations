-- =====================================================
-- DashSpect 3.0 Database Schema Migration
-- Adds: Workforce, Tasks, Inventory, Training, Insights, Integrations
-- Preserves: Existing tables and data
-- =====================================================

-- =====================================================
-- 1. WORKFORCE (Staffeine) MODULE
-- =====================================================

-- Enhance existing employees table to be staff_profiles
-- Add new fields for comprehensive staff management
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'full-time' CHECK (contract_type IN ('full-time', 'part-time', 'contract', 'intern')),
ADD COLUMN IF NOT EXISTS base_salary numeric(10,2),
ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Staff locations (many-to-many)
CREATE TABLE IF NOT EXISTS staff_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, location_id)
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role text NOT NULL,
  required_count integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shift assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'declined', 'completed', 'no-show')),
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  notes text,
  UNIQUE(shift_id, staff_id)
);

-- Attendance logs
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  check_in_at timestamptz NOT NULL,
  check_out_at timestamptz,
  method text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'qr', 'app', 'biometric')),
  device_info jsonb,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid', 'closed')),
  total_amount numeric(12,2),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(company_id, start_date, end_date)
);

-- Payroll items
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('base', 'overtime', 'bonus', 'penalty', 'tips', 'deduction', 'adjustment')),
  amount numeric(10,2) NOT NULL,
  hours numeric(6,2),
  rate numeric(10,2),
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Staff performance scores
CREATE TABLE IF NOT EXISTS staff_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  overall_score numeric(5,2),
  score_components jsonb NOT NULL, -- {punctuality: 85, quality: 90, teamwork: 88, etc}
  evaluator_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Staff events (warnings, raises, bonuses)
CREATE TABLE IF NOT EXISTS staff_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('warning', 'raise', 'bonus', 'promotion', 'demotion', 'termination', 'other')),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2),
  description text NOT NULL,
  metadata jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. TASKS MODULE
-- =====================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  assigned_to uuid,
  due_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'audit', 'ai', 'recurring', 'equipment')),
  source_reference_id uuid, -- Reference to audit, equipment, etc
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Task templates
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  recurrence_pattern text, -- 'daily', 'weekly', 'monthly'
  assigned_role text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Task photos
CREATE TABLE IF NOT EXISTS task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  uploaded_by uuid NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. INVENTORY & INVOICES MODULE
-- =====================================================

-- Inventory items (product catalog)
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text NOT NULL, -- 'kg', 'liter', 'piece', etc
  typical_storage_location text,
  par_level numeric(10,2), -- Minimum stock level
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory snapshots (count sessions)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  taken_by uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'verified')),
  notes text,
  verified_by uuid,
  verified_at timestamptz
);

-- Inventory snapshot lines
CREATE TABLE IF NOT EXISTS inventory_snapshot_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES inventory_snapshots(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  counted_qty numeric(10,2) NOT NULL,
  estimated_cost numeric(10,2),
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date NOT NULL,
  total_amount numeric(12,2),
  file_url text,
  parsed_status text NOT NULL DEFAULT 'pending' CHECK (parsed_status IN ('pending', 'parsing', 'completed', 'failed', 'manual')),
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice lines
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_name_raw text NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. DOCUMENTS & TRAINING MODULE
-- =====================================================

-- Enhance existing documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS module_scope text,
ADD COLUMN IF NOT EXISTS required_reading boolean DEFAULT false;

-- Document reads (tracking who read what)
CREATE TABLE IF NOT EXISTS document_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid,
  staff_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  confirmed_understood boolean DEFAULT false,
  confirmed_at timestamptz
);

-- Training programs
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  required_for_roles text[], -- Array of role names
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Training steps (components of a program)
CREATE TABLE IF NOT EXISTS training_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('document', 'audit', 'task', 'test', 'video', 'external')),
  reference_id uuid, -- ID of document, audit template, test, etc
  title text NOT NULL,
  description text,
  estimated_minutes integer,
  is_required boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Training progress
CREATE TABLE IF NOT EXISTS training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  started_at timestamptz,
  completed_at timestamptz,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  last_activity_at timestamptz,
  UNIQUE(program_id, staff_id)
);

-- Training step completions
CREATE TABLE IF NOT EXISTS training_step_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id uuid NOT NULL REFERENCES training_progress(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES training_steps(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(progress_id, step_id)
);

-- =====================================================
-- 5. INSIGHTS & AI MODULE
-- =====================================================

-- Insight summaries (AI-generated reports)
CREATE TABLE IF NOT EXISTS insight_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  summary_type text NOT NULL CHECK (summary_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  content jsonb NOT NULL, -- Structured summary data
  content_html text, -- Rendered HTML version
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text DEFAULT 'ai'
);

-- Alerts (anomalies and issues)
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  category text NOT NULL CHECK (category IN ('staff', 'equipment', 'compliance', 'inventory', 'performance', 'other')),
  source text NOT NULL, -- 'ai', 'system', 'manual'
  source_reference_id uuid, -- Link to related entity
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. INTEGRATIONS MODULE
-- =====================================================

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('pos', 'invoicing', 'whatsapp', 'ai', 'accounting', 'hr', 'delivery', 'other')),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'error', 'configuring')),
  last_sync_at timestamptz,
  last_error text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Integration settings (encrypted key-value store)
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text, -- Encrypted value
  is_secret boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, key)
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  endpoint text,
  method text,
  headers jsonb,
  payload jsonb,
  response_status integer,
  response_body jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. PERMISSIONS & ROLES ENHANCEMENT
-- =====================================================

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_manage boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

-- Insert default role permissions
INSERT INTO role_permissions (role, module, can_view, can_edit, can_manage)
VALUES
  -- Admin full access
  ('admin', 'workforce', true, true, true),
  ('admin', 'audits', true, true, true),
  ('admin', 'tasks', true, true, true),
  ('admin', 'equipment', true, true, true),
  ('admin', 'inventory', true, true, true),
  ('admin', 'documents', true, true, true),
  ('admin', 'training', true, true, true),
  ('admin', 'insights', true, true, true),
  ('admin', 'integrations', true, true, true),
  
  -- Manager access
  ('manager', 'workforce', true, true, true),
  ('manager', 'audits', true, true, false),
  ('manager', 'tasks', true, true, true),
  ('manager', 'equipment', true, true, false),
  ('manager', 'inventory', true, true, false),
  ('manager', 'documents', true, false, false),
  ('manager', 'training', true, true, false),
  ('manager', 'insights', true, false, false),
  ('manager', 'integrations', true, false, false),
  
  -- Checker access
  ('checker', 'audits', true, true, false),
  ('checker', 'tasks', true, true, false),
  ('checker', 'equipment', true, false, false),
  ('checker', 'documents', true, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Workforce indexes
CREATE INDEX IF NOT EXISTS idx_shifts_location_date ON shifts(location_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_staff ON shift_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_staff ON attendance_logs(staff_id, check_in_at);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_staff_status ON time_off_requests(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_items_period_staff ON payroll_items(period_id, staff_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at) WHERE status != 'completed';

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_location_date ON inventory_snapshots(location_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_item ON invoice_lines(item_id);

-- Training indexes
CREATE INDEX IF NOT EXISTS idx_training_progress_staff ON training_progress(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_training_steps_program ON training_steps(program_id, step_order);

-- Insights indexes
CREATE INDEX IF NOT EXISTS idx_insight_summaries_company_period ON insight_summaries(company_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_alerts_company_unresolved ON alerts(company_id) WHERE resolved = false;

-- Integrations indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration_created ON webhook_logs(integration_id, created_at);

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'updated_at'
      AND table_name IN (
        'shifts', 'tasks', 'task_templates', 'inventory_items',
        'suppliers', 'training_programs', 'integrations', 'integration_settings'
      )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- =====================================================
-- 10. ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshot_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_step_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. BASIC RLS POLICIES (Company-scoped)
-- =====================================================

-- Workforce policies
CREATE POLICY "Users can view staff in their company" ON staff_locations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM employees e WHERE e.id = staff_id AND e.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Users can view shifts in their company" ON shifts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage shifts" ON shifts
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Users can view their shift assignments" ON shift_assignments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM shifts s 
    WHERE s.id = shift_id AND s.company_id = get_user_company_id(auth.uid())
  ));

-- Tasks policies
CREATE POLICY "Users can view tasks in their company" ON tasks
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    auth.uid() = created_by
  );

CREATE POLICY "Managers can manage tasks" ON tasks
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Inventory policies
CREATE POLICY "Users can view inventory in their company" ON inventory_items
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage inventory" ON inventory_items
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Training policies
CREATE POLICY "Users can view training in their company" ON training_programs
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage training" ON training_programs
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Insights policies
CREATE POLICY "Users can view insights in their company" ON insight_summaries
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view alerts in their company" ON alerts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- Integrations policies
CREATE POLICY "Admins can view integrations" ON integrations
  FOR SELECT USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_company_role(auth.uid(), 'company_admin'))
  );

CREATE POLICY "Admins can manage integrations" ON integrations
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_company_role(auth.uid(), 'company_admin'))
  );

-- Role permissions (read-only for most users)
CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));