-- Create recurring audit schedules table
CREATE TABLE public.recurring_audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_generated_date DATE
);

-- Create index for efficient queries
CREATE INDEX idx_recurring_schedules_active ON public.recurring_audit_schedules(is_active);
CREATE INDEX idx_recurring_schedules_location ON public.recurring_audit_schedules(location_id);
CREATE INDEX idx_recurring_schedules_next_run ON public.recurring_audit_schedules(last_generated_date, is_active);

-- Enable RLS
ALTER TABLE public.recurring_audit_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can view recurring schedules"
  ON public.recurring_audit_schedules
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can create recurring schedules"
  ON public.recurring_audit_schedules
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) AND
    auth.uid() = created_by
  );

CREATE POLICY "Admins and managers can update recurring schedules"
  ON public.recurring_audit_schedules
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can delete recurring schedules"
  ON public.recurring_audit_schedules
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE TRIGGER update_recurring_schedules_updated_at
  BEFORE UPDATE ON public.recurring_audit_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate next occurrence date
CREATE OR REPLACE FUNCTION public.get_next_schedule_date(
  p_last_date DATE,
  p_pattern TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_next_date DATE;
  v_candidate_date DATE;
BEGIN
  CASE p_pattern
    WHEN 'daily' THEN
      v_next_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 day';
    
    WHEN 'weekly' THEN
      v_candidate_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 day';
      -- Find next occurrence of the specified day of week
      WHILE EXTRACT(DOW FROM v_candidate_date) != p_day_of_week LOOP
        v_candidate_date := v_candidate_date + INTERVAL '1 day';
      END LOOP;
      v_next_date := v_candidate_date;
    
    WHEN 'monthly' THEN
      v_candidate_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 month';
      -- Try to set to the specified day of month
      BEGIN
        v_next_date := DATE_TRUNC('month', v_candidate_date) + (p_day_of_month - 1) * INTERVAL '1 day';
        -- If the day doesn't exist in this month, use last day of month
        IF EXTRACT(DAY FROM v_next_date) != p_day_of_month THEN
          v_next_date := DATE_TRUNC('month', v_candidate_date) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If date calculation fails, use last day of month
        v_next_date := DATE_TRUNC('month', v_candidate_date) + INTERVAL '1 month' - INTERVAL '1 day';
      END;
  END CASE;
  
  RETURN v_next_date;
END;
$$;