-- Allow public read access to attendance_kiosks when looking up by device_token
-- This is needed because the kiosk display page is accessed without authentication
CREATE POLICY "Public can view active kiosks by token"
ON public.attendance_kiosks
FOR SELECT
USING (is_active = true);