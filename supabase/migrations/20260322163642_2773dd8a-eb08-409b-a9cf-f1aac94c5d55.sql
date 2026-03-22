
CREATE OR REPLACE FUNCTION public.archive_idle_dash_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  UPDATE public.dash_sessions
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'active'
    AND updated_at < NOW() - INTERVAL '4 hours';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
