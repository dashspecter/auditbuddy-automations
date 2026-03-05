-- Allow anon to read locations and departments for kiosk join queries
CREATE POLICY "Anon can view locations"
ON public.locations
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can view departments"
ON public.departments
FOR SELECT
TO anon
USING (true);