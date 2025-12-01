-- Create location_operating_schedules table
CREATE TABLE IF NOT EXISTS location_operating_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Monday, 6 = Sunday
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(location_id, day_of_week)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_operating_schedules_location 
ON location_operating_schedules(location_id);

-- Enable RLS
ALTER TABLE location_operating_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view schedules for locations in their company"
ON location_operating_schedules FOR SELECT
USING (
  location_id IN (
    SELECT id FROM locations WHERE company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Managers can manage location schedules"
ON location_operating_schedules FOR ALL
USING (
  (location_id IN (
    SELECT id FROM locations WHERE company_id = get_user_company_id(auth.uid())
  )) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  (location_id IN (
    SELECT id FROM locations WHERE company_id = get_user_company_id(auth.uid())
  )) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Function to validate shift is within operating hours
CREATE OR REPLACE FUNCTION validate_shift_within_operating_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_of_week_num INTEGER;
  operating_schedule RECORD;
BEGIN
  -- Get day of week (0 = Monday, 6 = Sunday)
  day_of_week_num := EXTRACT(ISODOW FROM NEW.shift_date::date) - 1;
  
  -- Check if location has operating schedule for this day
  SELECT * INTO operating_schedule
  FROM location_operating_schedules
  WHERE location_id = NEW.location_id
    AND day_of_week = day_of_week_num;
  
  -- If no schedule exists, allow the shift (location operates 24/7)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- If location is closed on this day, reject
  IF operating_schedule.is_closed THEN
    RAISE EXCEPTION 'Location is closed on this day of the week';
  END IF;
  
  -- Validate shift times are within operating hours
  IF NEW.start_time < operating_schedule.open_time THEN
    RAISE EXCEPTION 'Shift start time (%) is before location opens (%)', 
      NEW.start_time, operating_schedule.open_time;
  END IF;
  
  IF NEW.end_time > operating_schedule.close_time THEN
    RAISE EXCEPTION 'Shift end time (%) is after location closes (%)', 
      NEW.end_time, operating_schedule.close_time;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to validate shifts
DROP TRIGGER IF EXISTS validate_shift_times ON shifts;
CREATE TRIGGER validate_shift_times
  BEFORE INSERT OR UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_shift_within_operating_hours();