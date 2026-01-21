-- Add a secure RPC for kiosk attendance reads (works without custom headers / CORS issues)
-- Returns only the fields needed by the kiosk UI.

CREATE OR REPLACE FUNCTION public.get_kiosk_attendance_logs(
  p_token text,
  p_location_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  id uuid,
  staff_id uuid,
  check_in_at timestamptz,
  check_out_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate kiosk token/slug against an active kiosk for this location
  IF NOT EXISTS (
    SELECT 1
    FROM public.attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (
        k.device_token = p_token
        OR k.custom_slug = p_token
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT al.id, al.staff_id, al.check_in_at, al.check_out_at
  FROM public.attendance_logs al
  WHERE al.location_id = p_location_id
    AND al.check_in_at >= p_start
    AND al.check_in_at <= p_end
  ORDER BY al.check_in_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kiosk_attendance_logs(text, uuid, timestamptz, timestamptz) TO anon;
