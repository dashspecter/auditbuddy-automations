-- Add additional columns to shifts table for 7shifts-style functionality
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS breaks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_open_shift BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS close_duty BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 0;

-- Drop time_off_requests table if exists to recreate cleanly
DROP TABLE IF EXISTS time_off_requests CASCADE;

-- Create time_off_requests table
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Create indexes for time_off_requests
CREATE INDEX idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_requests_company ON time_off_requests(company_id);

-- Enable RLS on time_off_requests
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_off_requests
CREATE POLICY "Users can view time off in their company"
  ON time_off_requests FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Employees can create time off requests"
  ON time_off_requests FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update time off requests"
  ON time_off_requests FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Drop labor_costs table if exists
DROP TABLE IF EXISTS labor_costs CASCADE;

-- Create labor_costs table for tracking daily labor budgets and actuals
CREATE TABLE labor_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  scheduled_hours NUMERIC DEFAULT 0,
  scheduled_cost NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  projected_sales NUMERIC DEFAULT 0,
  actual_sales NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, date)
);

-- Create indexes for labor_costs
CREATE INDEX idx_labor_costs_location_date ON labor_costs(location_id, date);
CREATE INDEX idx_labor_costs_company ON labor_costs(company_id);

-- Enable RLS on labor_costs
ALTER TABLE labor_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for labor_costs
CREATE POLICY "Users can view labor costs in their company"
  ON labor_costs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage labor costs"
  ON labor_costs FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );