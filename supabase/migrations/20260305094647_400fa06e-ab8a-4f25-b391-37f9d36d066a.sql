-- Drop the TO anon policies and recreate as TO public (matching original working config)

-- attendance_kiosks
DROP POLICY IF EXISTS "Anon can view active kiosks" ON public.attendance_kiosks;
DROP POLICY IF EXISTS "Anon can heartbeat active kiosks" ON public.attendance_kiosks;

CREATE POLICY "Public can view active kiosks"
ON public.attendance_kiosks FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Public can heartbeat active kiosks"
ON public.attendance_kiosks FOR UPDATE TO public
USING (is_active = true)
WITH CHECK (is_active = true);

-- locations
DROP POLICY IF EXISTS "Anon can view locations" ON public.locations;

CREATE POLICY "Public can view locations"
ON public.locations FOR SELECT TO public
USING (true);

-- departments
DROP POLICY IF EXISTS "Anon can view departments" ON public.departments;

CREATE POLICY "Public can view departments"
ON public.departments FOR SELECT TO public
USING (true);

NOTIFY pgrst, 'reload schema';