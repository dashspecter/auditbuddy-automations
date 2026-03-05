
-- Part 2: Create SECURITY DEFINER RPC for kiosk lookup, then tighten RLS

-- 1. Create the RPC that bypasses RLS for kiosk lookup
CREATE OR REPLACE FUNCTION public.get_kiosk_by_token_or_slug(p_token text)
RETURNS TABLE(
  id uuid,
  location_id uuid,
  company_id uuid,
  department_id uuid,
  device_token text,
  device_name text,
  is_active boolean,
  last_active_at timestamptz,
  registered_by uuid,
  registered_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  custom_slug text,
  location_name text,
  location_address text,
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.location_id,
    k.company_id,
    k.department_id,
    k.device_token,
    k.device_name,
    k.is_active,
    k.last_active_at,
    k.registered_by,
    k.registered_at,
    k.created_at,
    k.updated_at,
    k.custom_slug,
    l.name AS location_name,
    l.address AS location_address,
    d.name AS department_name
  FROM attendance_kiosks k
  LEFT JOIN locations l ON l.id = k.location_id
  LEFT JOIN departments d ON d.id = k.department_id
  WHERE k.is_active = true
    AND (
      lower(k.custom_slug) = lower(p_token)
      OR k.device_token = p_token
    )
  LIMIT 1;
END;
$$;

-- 2. Create an RPC for the keep-alive update (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_kiosk_last_active(p_kiosk_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE attendance_kiosks
  SET last_active_at = now()
  WHERE id = p_kiosk_id
    AND is_active = true;
END;
$$;

-- 3. Drop the overly permissive public SELECT policies
DROP POLICY IF EXISTS "Public can view active kiosks by token" ON attendance_kiosks;
DROP POLICY IF EXISTS "Public can view active kiosks by token or slug" ON attendance_kiosks;

-- 4. Drop the overly permissive public UPDATE policy (replaced by RPC)
DROP POLICY IF EXISTS "Public can update kiosk last_active_at" ON attendance_kiosks;
