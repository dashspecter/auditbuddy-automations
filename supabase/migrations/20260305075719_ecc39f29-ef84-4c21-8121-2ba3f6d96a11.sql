CREATE OR REPLACE FUNCTION public.get_kiosk_department_role_names(p_token text, p_location_id uuid, p_department_id uuid)
  RETURNS TABLE(name text)
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
  SELECT er.name
  FROM employee_roles er
  WHERE er.department_id = p_department_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kiosk_department_role_names(text, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_kiosk_department_role_names(text, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';