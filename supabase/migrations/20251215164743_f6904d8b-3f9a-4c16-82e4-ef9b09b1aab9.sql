-- Create a security definer function to check kiosk task access
-- This breaks the circular dependency between tasks and task_locations
CREATE OR REPLACE FUNCTION public.kiosk_can_view_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM task_locations tl
    JOIN attendance_kiosks ak ON ak.location_id = tl.location_id
    WHERE tl.task_id = _task_id 
    AND ak.is_active = true
  )
$$;

-- Create a security definer function to check kiosk task_location access
CREATE OR REPLACE FUNCTION public.kiosk_can_view_task_location(_location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM attendance_kiosks ak
    WHERE ak.location_id = _location_id 
    AND ak.is_active = true
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Kiosk can view tasks for its location" ON tasks;
DROP POLICY IF EXISTS "Kiosk can view task locations for its location" ON task_locations;

-- Recreate with security definer functions
CREATE POLICY "Kiosk can view tasks for its location" 
ON tasks 
FOR SELECT 
USING (public.kiosk_can_view_task(id));

CREATE POLICY "Kiosk can view task locations for its location" 
ON task_locations 
FOR SELECT 
USING (public.kiosk_can_view_task_location(location_id));