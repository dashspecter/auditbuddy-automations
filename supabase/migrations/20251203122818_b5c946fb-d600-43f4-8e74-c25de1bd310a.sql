-- Create junction table for task-location many-to-many relationship
CREATE TABLE public.task_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, location_id)
);

-- Enable RLS
ALTER TABLE public.task_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view task locations in their company"
ON public.task_locations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t 
  WHERE t.id = task_locations.task_id 
  AND t.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Managers can manage task locations"
ON public.task_locations FOR ALL
USING (EXISTS (
  SELECT 1 FROM tasks t 
  WHERE t.id = task_locations.task_id 
  AND t.company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
));

CREATE POLICY "Users can create task locations for their tasks"
ON public.task_locations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t 
  WHERE t.id = task_locations.task_id 
  AND t.company_id = get_user_company_id(auth.uid())
));