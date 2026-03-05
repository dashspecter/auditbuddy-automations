DROP POLICY IF EXISTS "Kiosk can view employees at its location" ON public.employees;

CREATE POLICY "Kiosk can view employees at its location"
ON public.employees FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM attendance_kiosks ak
    WHERE ak.location_id = employees.location_id
    AND ak.is_active = true
    AND ak.company_id = employees.company_id
  )
);