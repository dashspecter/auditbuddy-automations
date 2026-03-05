-- Restore anonymous kiosk compatibility policies (pre-hardening behavior)
-- This allows kiosk devices to load and heartbeat without authentication

-- 1. Anonymous SELECT for active kiosks (kiosk page load)
CREATE POLICY "Anon can view active kiosks"
ON public.attendance_kiosks
FOR SELECT
TO anon
USING (is_active = true);

-- 2. Anonymous UPDATE for heartbeat (last_active_at only, active rows)
CREATE POLICY "Anon can heartbeat active kiosks"
ON public.attendance_kiosks
FOR UPDATE
TO anon
USING (is_active = true)
WITH CHECK (is_active = true);