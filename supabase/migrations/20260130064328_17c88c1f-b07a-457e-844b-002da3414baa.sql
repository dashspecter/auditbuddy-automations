-- Create table for tracking which warnings employees have seen
CREATE TABLE public.employee_warning_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id uuid NOT NULL REFERENCES public.staff_events(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warning_id, employee_id)
);

-- Add index for faster lookups
CREATE INDEX idx_employee_warning_views_employee ON public.employee_warning_views(employee_id);
CREATE INDEX idx_employee_warning_views_warning ON public.employee_warning_views(warning_id);

-- Enable RLS
ALTER TABLE public.employee_warning_views ENABLE ROW LEVEL SECURITY;

-- Employees can view and insert their own seen records
CREATE POLICY "Employees can view own warning views"
  ON public.employee_warning_views
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can mark warnings as seen"
  ON public.employee_warning_views
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Admins and managers can view all records
CREATE POLICY "Admins managers can view all warning views"
  ON public.employee_warning_views
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR
    has_company_role(auth.uid(), 'company_admin'::text)
  );