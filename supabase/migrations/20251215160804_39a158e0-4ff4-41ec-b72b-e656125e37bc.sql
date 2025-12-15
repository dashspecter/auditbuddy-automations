-- Allow public (unauthenticated) access to read active kiosks by token/slug
-- This is needed because kiosk displays run on tablets without user login
CREATE POLICY "Public can view active kiosks by token or slug"
ON public.attendance_kiosks
FOR SELECT
USING (is_active = true);

-- Also allow public to update last_active_at for heartbeat functionality
CREATE POLICY "Public can update kiosk last_active_at"
ON public.attendance_kiosks
FOR UPDATE
USING (is_active = true)
WITH CHECK (is_active = true);