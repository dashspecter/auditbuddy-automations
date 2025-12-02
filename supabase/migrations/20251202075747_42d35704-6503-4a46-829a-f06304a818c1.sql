-- Fix the notify_managers_of_time_off_request function to use a valid alert category
-- The alerts table only allows: 'staff', 'equipment', 'compliance', 'inventory', 'performance', 'other'
-- Time off requests should use 'staff' category

CREATE OR REPLACE FUNCTION public.notify_managers_of_time_off_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  employee_name TEXT;
  request_days INTEGER;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    -- Get employee name
    SELECT full_name INTO employee_name
    FROM employees
    WHERE id = NEW.employee_id;
    
    -- Calculate days
    request_days := (NEW.end_date - NEW.start_date) + 1;
    
    -- Create alert for managers using 'staff' category
    INSERT INTO alerts (
      company_id,
      title,
      message,
      severity,
      category,
      source,
      source_reference_id,
      metadata
    ) VALUES (
      NEW.company_id,
      'Time Off Request Pending',
      employee_name || ' requested ' || request_days || ' days off from ' || 
        TO_CHAR(NEW.start_date, 'Mon DD') || ' to ' || TO_CHAR(NEW.end_date, 'Mon DD, YYYY'),
      'info',
      'staff',  -- Changed from 'time_off' to 'staff'
      'time_off_requests',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'employee_name', employee_name,
        'request_type', NEW.request_type,
        'days', request_days
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;