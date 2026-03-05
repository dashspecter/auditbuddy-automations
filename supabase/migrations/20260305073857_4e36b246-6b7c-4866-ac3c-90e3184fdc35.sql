-- Step 1: Create SECURITY DEFINER RPC for kiosk employee access
CREATE OR REPLACE FUNCTION public.get_kiosk_employees(
  p_token TEXT,
  p_location_id UUID
)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, role TEXT, user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (k.device_token = p_token OR k.custom_slug = p_token)
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

-- Step 2: Drop the leaky kiosk employees RLS policy
DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;