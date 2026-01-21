-- Allow the public kiosk screen to read attendance logs ONLY when a valid kiosk token is provided
-- via request header `x-kiosk-token`.
-- This avoids overly-permissive anonymous access while keeping the kiosk usable.

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kiosk token can view attendance logs" ON public.attendance_logs;

CREATE POLICY "Kiosk token can view attendance logs"
ON public.attendance_logs
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = attendance_logs.location_id
      AND (
        k.device_token = current_setting('request.header.x-kiosk-token', true)
        OR k.custom_slug = current_setting('request.header.x-kiosk-token', true)
      )
  )
);
