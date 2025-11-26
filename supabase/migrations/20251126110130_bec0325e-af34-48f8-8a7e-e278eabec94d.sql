-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admins and managers can manage employees"
ON public.employees
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Checkers can view active employees"
ON public.employees
FOR SELECT
USING (has_role(auth.uid(), 'checker'::app_role) AND status = 'active');

-- Create staff_audits table
CREATE TABLE public.staff_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.audit_templates(id) ON DELETE SET NULL,
  auditor_id UUID NOT NULL REFERENCES auth.users(id),
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  custom_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_audits
CREATE POLICY "Authenticated users can create staff audits"
ON public.staff_audits
FOR INSERT
WITH CHECK (auth.uid() = auditor_id);

CREATE POLICY "Users can view audits based on role"
ON public.staff_audits
FOR SELECT
USING (
  auth.uid() = auditor_id OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update their own staff audits"
ON public.staff_audits
FOR UPDATE
USING (auth.uid() = auditor_id);

CREATE POLICY "Managers can update all staff audits"
ON public.staff_audits
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete staff audits"
ON public.staff_audits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_staff_audits_updated_at
BEFORE UPDATE ON public.staff_audits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for performance
CREATE INDEX idx_employees_location_id ON public.employees(location_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_staff_audits_employee_id ON public.staff_audits(employee_id);
CREATE INDEX idx_staff_audits_location_id ON public.staff_audits(location_id);
CREATE INDEX idx_staff_audits_audit_date ON public.staff_audits(audit_date DESC);