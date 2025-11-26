-- Allow public access to location info when accessed through test assignments
CREATE POLICY "Anyone can view locations through test assignments"
ON public.locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.test_assignments ta
    JOIN public.employees e ON ta.employee_id = e.id
    WHERE e.location_id = locations.id
    AND ta.short_code IS NOT NULL
  )
);