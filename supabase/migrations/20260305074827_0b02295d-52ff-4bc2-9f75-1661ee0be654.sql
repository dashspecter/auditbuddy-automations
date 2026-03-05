CREATE OR REPLACE FUNCTION public.get_kiosk_employees(p_token text, p_location_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, role text, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (k.device_token = p_token OR lower(k.custom_slug) = lower(p_token))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.id, e.full_name, e.avatar_url, e.role, e.user_id
  FROM employees e
  WHERE e.location_id = p_location_id
    AND e.status = 'active'
  ORDER BY e.full_name;
END;
$$;

NOTIFY pgrst, 'reload schema';