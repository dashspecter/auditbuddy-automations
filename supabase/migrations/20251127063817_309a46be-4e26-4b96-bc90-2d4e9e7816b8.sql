-- Create function to update overdue interventions
CREATE OR REPLACE FUNCTION public.update_overdue_interventions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.equipment_interventions
  SET status = 'overdue'
  WHERE status = 'scheduled'
    AND scheduled_for < now();
END;
$$;