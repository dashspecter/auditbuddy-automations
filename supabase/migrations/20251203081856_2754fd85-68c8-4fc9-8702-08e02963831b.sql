CREATE OR REPLACE FUNCTION public.validate_shift_within_operating_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  day_of_week_num INTEGER;
  operating_schedule RECORD;
  is_overnight_operation BOOLEAN;
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
  
  -- Determine if this is an overnight operation
  -- Overnight: close_time < open_time (e.g., opens 10:00, closes 01:00 next day)
  -- Also treat 00:00:00 close time as midnight (end of day)
  is_overnight_operation := operating_schedule.close_time < operating_schedule.open_time 
                            AND operating_schedule.close_time != '00:00:00'::time;
  
  -- Handle midnight close time (00:00:00 means end of day, not start)
  IF operating_schedule.close_time = '00:00:00'::time THEN
    -- Validate shift start time
    IF NEW.start_time < operating_schedule.open_time THEN
      RAISE EXCEPTION 'Shift start time (%) is before location opens (%)', 
        NEW.start_time, operating_schedule.open_time;
    END IF;
    -- Any end time is valid since we're open until midnight
    RETURN NEW;
  END IF;
  
  IF is_overnight_operation THEN
    -- Overnight operation: valid times are from open_time to 23:59:59 OR from 00:00 to close_time
    -- Validate shift start time
    IF NEW.start_time < operating_schedule.open_time AND NEW.start_time > operating_schedule.close_time THEN
      RAISE EXCEPTION 'Shift start time (%) is outside operating hours (% - %)', 
        NEW.start_time, operating_schedule.open_time, operating_schedule.close_time;
    END IF;
    
    -- Validate shift end time
    -- End time is valid if: (>= open_time) OR (<= close_time of next day)
    IF NEW.end_time < operating_schedule.open_time AND NEW.end_time > operating_schedule.close_time THEN
      RAISE EXCEPTION 'Shift end time (%) is outside operating hours (% - %)', 
        NEW.end_time, operating_schedule.open_time, operating_schedule.close_time;
    END IF;
  ELSE
    -- Normal daytime operation
    -- Validate shift start time
    IF NEW.start_time < operating_schedule.open_time THEN
      RAISE EXCEPTION 'Shift start time (%) is before location opens (%)', 
        NEW.start_time, operating_schedule.open_time;
    END IF;
    
    -- Validate shift end time
    IF NEW.end_time > operating_schedule.close_time THEN
      RAISE EXCEPTION 'Shift end time (%) is after location closes (%)', 
        NEW.end_time, operating_schedule.close_time;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;