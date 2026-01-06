-- Add kiosk policy for task_roles table to allow anonymous kiosk access
CREATE POLICY "Kiosk can view task roles for its location" ON public.task_roles
FOR SELECT TO public
USING (
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN task_locations tl ON tl.task_id = t.id
    JOIN attendance_kiosks ak ON ak.location_id = tl.location_id
    WHERE ak.is_active = true
  )
);