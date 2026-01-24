-- Create function to convert local date range to UTC timestamps (DST-safe)
CREATE OR REPLACE FUNCTION public.tz_date_range_to_utc(
  from_date date,
  to_date date,
  tz text DEFAULT 'Europe/Bucharest'
)
RETURNS TABLE (from_utc timestamptz, to_utc timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Start of from_date in the given timezone, converted to UTC
    (from_date::timestamp AT TIME ZONE tz) AS from_utc,
    -- Start of the day AFTER to_date in the given timezone (exclusive end)
    ((to_date + 1)::timestamp AT TIME ZONE tz) AS to_utc
$$;

-- Create function to convert UTC timestamp to local date in a timezone
CREATE OR REPLACE FUNCTION public.tz_timestamp_to_local_date(
  ts timestamptz,
  tz text DEFAULT 'Europe/Bucharest'
)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ts AT TIME ZONE tz)::date
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.tz_date_range_to_utc(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tz_date_range_to_utc(date, date, text) TO anon;
GRANT EXECUTE ON FUNCTION public.tz_timestamp_to_local_date(timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tz_timestamp_to_local_date(timestamptz, text) TO anon;