-- Create task_roles junction table for multiple role assignments
CREATE TABLE IF NOT EXISTS public.task_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.employee_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, role_id)
);

-- Enable RLS
ALTER TABLE public.task_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company users can view task roles" 
ON public.task_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND task_id IN (
    SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company users can manage task roles" 
ON public.task_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND task_id IN (
    SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  )
);