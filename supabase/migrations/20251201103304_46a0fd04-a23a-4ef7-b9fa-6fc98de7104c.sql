-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  display_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Add index for better performance
CREATE INDEX idx_departments_company_id ON public.departments(company_id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Users can view departments in their company"
  ON public.departments
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and owners can create departments"
  ON public.departments
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid() 
    AND cu.company_role IN ('company_owner', 'company_admin')
  ));

CREATE POLICY "Admins and owners can update departments"
  ON public.departments
  FOR UPDATE
  USING (company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid() 
    AND cu.company_role IN ('company_owner', 'company_admin')
  ));

CREATE POLICY "Admins and owners can delete departments"
  ON public.departments
  FOR DELETE
  USING (company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid() 
    AND cu.company_role IN ('company_owner', 'company_admin')
  ));

-- Migrate existing departments from employee_roles to departments table
INSERT INTO public.departments (company_id, name, created_by, display_order)
SELECT DISTINCT 
  er.company_id,
  er.department,
  er.created_by,
  CASE er.department
    WHEN 'Kitchen' THEN 1
    WHEN 'Front of House' THEN 2
    WHEN 'Management' THEN 3
    ELSE 999
  END as display_order
FROM public.employee_roles er
WHERE er.department IS NOT NULL
  AND er.department != 'General'
ON CONFLICT (company_id, name) DO NOTHING;

-- Add a General department for each company if it doesn't exist
INSERT INTO public.departments (company_id, name, description, created_by, display_order)
SELECT DISTINCT 
  er.company_id,
  'General',
  'General staff positions',
  er.created_by,
  0
FROM public.employee_roles er
ON CONFLICT (company_id, name) DO NOTHING;

-- Change employee_roles.department to reference departments table
ALTER TABLE public.employee_roles 
DROP COLUMN department;

ALTER TABLE public.employee_roles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Update existing roles to link to departments
UPDATE public.employee_roles er
SET department_id = (
  SELECT d.id 
  FROM public.departments d 
  WHERE d.company_id = er.company_id 
  AND d.name = 'General'
  LIMIT 1
);

-- Add index
CREATE INDEX idx_employee_roles_department_id ON public.employee_roles(department_id);