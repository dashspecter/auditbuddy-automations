-- Drop the overly permissive kiosk SELECT policy on attendance_logs
-- This policy allowed unauthenticated access if an active kiosk exists at the location
DROP POLICY IF EXISTS "Kiosk can view attendance at its location" ON public.attendance_logs;