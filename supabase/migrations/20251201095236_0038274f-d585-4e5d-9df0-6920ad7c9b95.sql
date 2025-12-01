-- Create employee_roles table for managing custom roles
CREATE TABLE public.employee_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_roles
CREATE POLICY "Users can view roles in their company"
  ON public.employee_roles
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can create roles"
  ON public.employee_roles
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id 
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.company_role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY "Admins and owners can update roles"
  ON public.employee_roles
  FOR UPDATE
  USING (
    company_id IN (
      SELECT cu.company_id 
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.company_role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY "Admins and owners can delete roles"
  ON public.employee_roles
  FOR DELETE
  USING (
    company_id IN (
      SELECT cu.company_id 
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.company_role IN ('company_owner', 'company_admin')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_employee_roles_updated_at
  BEFORE UPDATE ON public.employee_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default roles for existing companies
INSERT INTO public.employee_roles (company_id, name, description, color, created_by)
SELECT 
  c.id,
  role_name,
  role_description,
  role_color,
  cu.user_id
FROM public.companies c
CROSS JOIN (
  VALUES 
    ('Server', 'Front-of-house service staff', '#3b82f6'),
    ('Cook', 'Kitchen preparation staff', '#ef4444'),
    ('Manager', 'Management and supervisory staff', '#8b5cf6'),
    ('Bartender', 'Bar service staff', '#06b6d4'),
    ('Host', 'Front desk and seating staff', '#10b981'),
    ('Dishwasher', 'Kitchen cleaning staff', '#6b7280'),
    ('Chef', 'Head kitchen staff', '#f59e0b')
) AS defaults(role_name, role_description, role_color)
LEFT JOIN public.company_users cu ON cu.company_id = c.id AND cu.company_role = 'company_owner'
WHERE cu.user_id IS NOT NULL
ON CONFLICT (company_id, name) DO NOTHING;