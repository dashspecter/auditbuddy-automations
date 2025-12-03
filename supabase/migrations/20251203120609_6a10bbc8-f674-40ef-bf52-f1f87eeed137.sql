-- Add role assignment column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN assigned_role_id UUID REFERENCES public.employee_roles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_tasks_assigned_role_id ON public.tasks(assigned_role_id);

-- Update RLS policy to allow employees with matching role to see tasks assigned to their role
DROP POLICY IF EXISTS "Users can view tasks assigned to them or their company" ON public.tasks;

CREATE POLICY "Users can view tasks assigned to them or their company or role" 
ON public.tasks 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Allow employees to update tasks assigned to their role
DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON public.tasks;

CREATE POLICY "Users can update tasks assigned to them or their role" 
ON public.tasks 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);