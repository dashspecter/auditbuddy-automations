-- Fix the validate_shift_within_operating_hours function to handle midnight close times
CREATE OR REPLACE FUNCTION public.validate_shift_within_operating_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  day_of_week_num INTEGER;
  operating_schedule RECORD;
  is_midnight_close BOOLEAN;
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
  
  -- Check if close time is midnight (00:00:00)
  is_midnight_close := operating_schedule.close_time = '00:00:00'::time;
  
  -- Validate shift start time is within operating hours
  IF NEW.start_time < operating_schedule.open_time THEN
    RAISE EXCEPTION 'Shift start time (%) is before location opens (%)', 
      NEW.start_time, operating_schedule.open_time;
  END IF;
  
  -- Validate shift end time
  -- For midnight close (00:00:00), any end time from opening onwards is valid
  -- since 00:00:00 represents end of day (midnight)
  IF NOT is_midnight_close THEN
    -- Normal case: check if end time exceeds close time
    IF NEW.end_time > operating_schedule.close_time THEN
      RAISE EXCEPTION 'Shift end time (%) is after location closes (%)', 
        NEW.end_time, operating_schedule.close_time;
    END IF;
  END IF;
  -- If is_midnight_close is true, any end time is valid as long as start time is valid
  
  RETURN NEW;
END;
$function$;