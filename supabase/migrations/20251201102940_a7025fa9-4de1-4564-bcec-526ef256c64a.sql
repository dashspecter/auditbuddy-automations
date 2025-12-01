-- Add department field to employee_roles table
ALTER TABLE public.employee_roles 
ADD COLUMN department TEXT DEFAULT 'General';

-- Add index for better performance
CREATE INDEX idx_employee_roles_department ON public.employee_roles(department);

-- Update existing roles with default departments (examples)
UPDATE public.employee_roles 
SET department = 'Kitchen' 
WHERE name IN ('Chef', 'Sous Chef', 'Line Cook', 'Prep Cook', 'Dishwasher');

UPDATE public.employee_roles 
SET department = 'Front of House' 
WHERE name IN ('Server', 'Host', 'Bartender', 'Busser', 'Manager');

UPDATE public.employee_roles 
SET department = 'Management' 
WHERE name IN ('Manager', 'Assistant Manager', 'Shift Lead');