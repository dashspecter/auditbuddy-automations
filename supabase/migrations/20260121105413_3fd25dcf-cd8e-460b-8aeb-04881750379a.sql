-- Fix kiosk header extraction for PostgREST: use request.headers JSON.
-- Keeps kiosk anonymous access scoped to an active kiosk token/slug.

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
        k.device_token = (current_setting('request.headers', true)::json ->> 'x-kiosk-token')
        OR k.custom_slug = (current_setting('request.headers', true)::json ->> 'x-kiosk-token')
      )
  )
);
