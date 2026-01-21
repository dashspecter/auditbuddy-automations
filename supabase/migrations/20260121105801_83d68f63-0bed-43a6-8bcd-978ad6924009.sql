-- Update kiosk attendance policy to use an allowed browser header (x-client-info)
-- because custom headers like x-kiosk-token can be blocked by CORS.

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
        k.device_token = (current_setting('request.headers', true)::json ->> 'x-client-info')
        OR k.custom_slug = (current_setting('request.headers', true)::json ->> 'x-client-info')
      )
  )
);
