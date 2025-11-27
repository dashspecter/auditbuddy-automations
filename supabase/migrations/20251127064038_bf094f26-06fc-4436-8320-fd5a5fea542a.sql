-- Create recurring_maintenance_schedules table
CREATE TABLE public.recurring_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_time TIME NOT NULL,
  assigned_user_id UUID NOT NULL REFERENCES public.profiles(id),
  supervisor_user_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can manage recurring schedules"
ON public.recurring_maintenance_schedules FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view schedules for their assigned equipment"
ON public.recurring_maintenance_schedules FOR SELECT
USING (
  auth.uid() = assigned_user_id OR 
  auth.uid() = supervisor_user_id OR
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_maintenance_schedules_updated_at
BEFORE UPDATE ON public.recurring_maintenance_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();