-- Allow public (unauthenticated) access to read data for kiosk displays
-- These policies are scoped to specific location data via the kiosk's location_id

-- Employees: Allow public to view employees at specific locations
CREATE POLICY "Kiosk can view employees at its location"
ON public.employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
      AND ak.is_active = true
  )
);

-- Shifts: Allow public to view shifts at kiosk locations
CREATE POLICY "Kiosk can view shifts at its location"
ON public.shifts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = shifts.location_id
      AND ak.is_active = true
  )
);

-- Shift assignments: Allow public to view shift assignments for kiosk locations
CREATE POLICY "Kiosk can view shift assignments for its location"
ON public.shift_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shifts s
    JOIN attendance_kiosks ak ON ak.location_id = s.location_id
    WHERE s.id = shift_assignments.shift_id
      AND ak.is_active = true
  )
);

-- Attendance logs: Allow public to view attendance at kiosk locations (for check-in status)
CREATE POLICY "Kiosk can view attendance at its location"
ON public.attendance_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = attendance_logs.location_id
      AND ak.is_active = true
  )
);

-- Tasks: Allow public to view tasks for kiosk locations
CREATE POLICY "Kiosk can view tasks for its location"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM task_locations tl
    JOIN attendance_kiosks ak ON ak.location_id = tl.location_id
    WHERE tl.task_id = tasks.id
      AND ak.is_active = true
  )
);

-- Task locations: Allow public to view task locations for kiosk locations
CREATE POLICY "Kiosk can view task locations for its location"
ON public.task_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = task_locations.location_id
      AND ak.is_active = true
  )
);

-- Employee roles: Allow public to view employee roles for leaderboard display
CREATE POLICY "Kiosk can view employee roles"
ON public.employee_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN attendance_kiosks ak ON ak.location_id = e.location_id
    WHERE ak.is_active = true
      AND e.company_id = employee_roles.company_id
  )
);