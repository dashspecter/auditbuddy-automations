
-- Add vacation days tracking to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS annual_vacation_days INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS vacation_year_start_month INTEGER DEFAULT 1 CHECK (vacation_year_start_month BETWEEN 1 AND 12);

-- Add request_type column to time_off_requests if it doesn't exist
ALTER TABLE time_off_requests 
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'vacation' CHECK (request_type IN ('vacation', 'sick', 'personal', 'other'));

-- Add rejection reason
ALTER TABLE time_off_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN employees.annual_vacation_days IS 'Total vacation days allocated per year for this employee';
COMMENT ON COLUMN employees.vacation_year_start_month IS 'Month when vacation year starts (1-12, default January)';
COMMENT ON COLUMN time_off_requests.rejection_reason IS 'Reason provided by manager when rejecting the request';

-- Create function to check if employee has time off on a specific date
CREATE OR REPLACE FUNCTION public.employee_has_time_off(
  _employee_id UUID,
  _check_date DATE
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM time_off_requests
    WHERE employee_id = _employee_id
      AND status = 'approved'
      AND _check_date BETWEEN start_date AND end_date
  )
$$;

COMMENT ON FUNCTION employee_has_time_off IS 'Check if an employee has approved time off on a specific date';

-- Create trigger to prevent shift assignments during approved time off
CREATE OR REPLACE FUNCTION public.prevent_shift_during_time_off()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shift_date DATE;
  has_time_off BOOLEAN;
BEGIN
  -- Get the shift date
  SELECT s.shift_date INTO shift_date
  FROM shifts s
  WHERE s.id = NEW.shift_id;
  
  -- Check if employee has approved time off on this date
  SELECT public.employee_has_time_off(NEW.staff_id, shift_date) INTO has_time_off;
  
  IF has_time_off THEN
    RAISE EXCEPTION 'Employee has approved time off on %. Cannot assign shift.', shift_date;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on shift_assignments
DROP TRIGGER IF EXISTS check_time_off_before_assignment ON shift_assignments;
CREATE TRIGGER check_time_off_before_assignment
  BEFORE INSERT OR UPDATE ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_shift_during_time_off();

-- Create function to create alert when time off is requested
CREATE OR REPLACE FUNCTION public.notify_managers_of_time_off_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Create alert for managers
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
      'time_off',
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
$$;

-- Create trigger for time off notifications
DROP TRIGGER IF EXISTS time_off_request_alert ON time_off_requests;
CREATE TRIGGER time_off_request_alert
  AFTER INSERT ON time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_of_time_off_request();

-- Create index for time off date lookups
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(employee_id, start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(company_id, status) WHERE status = 'pending';
