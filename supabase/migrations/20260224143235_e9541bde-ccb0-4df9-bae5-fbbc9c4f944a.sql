
-- Fix midnight wrap bug in find_scheduled_shift_for_clockin (3-param overload)
CREATE OR REPLACE FUNCTION public.find_scheduled_shift_for_clockin(p_employee_id uuid, p_location_id uuid, p_check_time timestamp with time zone, p_grace_minutes integer DEFAULT 60)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, is_late boolean, late_minutes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check_date date;
  v_check_time time;
  v_grace_interval interval;
BEGIN
  v_check_date := (p_check_time AT TIME ZONE 'Europe/Bucharest')::date;
  v_check_time := (p_check_time AT TIME ZONE 'Europe/Bucharest')::time;
  v_grace_interval := (p_grace_minutes || ' minutes')::interval;
  
  RETURN QUERY
  SELECT 
    s.id AS shift_id,
    s.shift_date,
    s.start_time,
    s.end_time,
    (v_check_time > (s.start_time + v_grace_interval)) AS is_late,
    GREATEST(0, EXTRACT(EPOCH FROM (v_check_time - s.start_time)) / 60)::integer AS late_minutes
  FROM public.shifts s
  INNER JOIN public.shift_assignments sa ON sa.shift_id = s.id
  WHERE sa.staff_id = p_employee_id
    AND sa.approval_status = 'approved'
    AND s.location_id = p_location_id
    AND s.shift_date = v_check_date
    AND s.status NOT IN ('cancelled', 'deleted')
    AND v_check_time >= (s.start_time - v_grace_interval)
    AND (
      CASE 
        WHEN (s.end_time + v_grace_interval)::time < s.end_time THEN true
        ELSE v_check_time <= (s.end_time + v_grace_interval)
      END
    )
  ORDER BY ABS(EXTRACT(EPOCH FROM (v_check_time - s.start_time)))
  LIMIT 1;
END;
$function$;

-- Fix midnight wrap bug in find_scheduled_shift_for_clockin (4-param overload with company_id)
CREATE OR REPLACE FUNCTION public.find_scheduled_shift_for_clockin(p_company_id uuid, p_employee_id uuid, p_location_id uuid, p_check_time timestamp with time zone, p_grace_minutes integer DEFAULT 60)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, is_late boolean, late_minutes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_timezone text;
  v_check_date date;
  v_check_time time;
  v_grace_interval interval;
BEGIN
  v_timezone := public.get_company_timezone(p_company_id);
  v_check_date := (p_check_time AT TIME ZONE v_timezone)::date;
  v_check_time := (p_check_time AT TIME ZONE v_timezone)::time;
  v_grace_interval := (p_grace_minutes || ' minutes')::interval;
  
  RETURN QUERY
  SELECT 
    s.id AS shift_id,
    s.shift_date,
    s.start_time,
    s.end_time,
    (v_check_time > (s.start_time + v_grace_interval)) AS is_late,
    GREATEST(0, EXTRACT(EPOCH FROM (v_check_time - s.start_time)) / 60)::integer AS late_minutes
  FROM public.shifts s
  INNER JOIN public.shift_assignments sa ON sa.shift_id = s.id
  WHERE s.company_id = p_company_id
    AND sa.staff_id = p_employee_id
    AND sa.approval_status = 'approved'
    AND s.location_id = p_location_id
    AND s.shift_date = v_check_date
    AND COALESCE(s.status, 'active') NOT IN ('cancelled', 'deleted')
    AND v_check_time >= (s.start_time - v_grace_interval)
    AND (
      CASE 
        WHEN (s.end_time + v_grace_interval)::time < s.end_time THEN true
        ELSE v_check_time <= (s.end_time + v_grace_interval)
      END
    )
  ORDER BY ABS(EXTRACT(EPOCH FROM (v_check_time - s.start_time)))
  LIMIT 1;
END;
$function$;
