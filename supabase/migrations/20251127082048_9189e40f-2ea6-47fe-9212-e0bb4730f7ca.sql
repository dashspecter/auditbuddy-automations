-- Create equipment status history table
CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment status history
CREATE POLICY "Admins and managers can view status history"
  ON public.equipment_status_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Checkers can view status history"
  ON public.equipment_status_history
  FOR SELECT
  USING (has_role(auth.uid(), 'checker'::app_role));

-- Create function to log status changes
CREATE OR REPLACE FUNCTION public.log_equipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.equipment_status_history (
      equipment_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically log status changes
CREATE TRIGGER equipment_status_change_trigger
  AFTER UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.log_equipment_status_change();

-- Create index for better query performance
CREATE INDEX idx_equipment_status_history_equipment_id 
  ON public.equipment_status_history(equipment_id);

CREATE INDEX idx_equipment_status_history_changed_at 
  ON public.equipment_status_history(changed_at DESC);