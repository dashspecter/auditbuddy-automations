-- Fix search_path for get_next_schedule_date function
CREATE OR REPLACE FUNCTION public.get_next_schedule_date(
  p_last_date DATE,
  p_pattern TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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