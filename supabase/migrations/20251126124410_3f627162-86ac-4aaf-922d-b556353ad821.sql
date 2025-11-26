-- Create test_assignments table to track which employees should take which tests
CREATE TABLE public.test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(test_id, employee_id)
);

-- Enable RLS on test_assignments
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage test assignments
CREATE POLICY "Admins and managers can manage test assignments"
ON public.test_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Employees can view their own assignments
CREATE POLICY "Employees can view their own assignments"
ON public.test_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = test_assignments.employee_id
    AND employees.created_by = auth.uid()
  )
);

-- Add employee_id to test_submissions and make staff_name/location nullable for migration
ALTER TABLE public.test_submissions
ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
ALTER COLUMN staff_name DROP NOT NULL,
ALTER COLUMN staff_location DROP NOT NULL;

-- Update test_submissions RLS to allow employees to submit their own tests
CREATE POLICY "Employees can submit their assigned tests"
ON public.test_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = test_submissions.employee_id
    AND employees.created_by = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_test_assignments_employee ON public.test_assignments(employee_id);
CREATE INDEX idx_test_assignments_test ON public.test_assignments(test_id);
CREATE INDEX idx_test_submissions_employee ON public.test_submissions(employee_id);