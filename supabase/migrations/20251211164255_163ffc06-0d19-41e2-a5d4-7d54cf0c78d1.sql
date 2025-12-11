-- Drop duplicate/conflicting insert policies and create a clean one
DROP POLICY IF EXISTS "Anyone can insert mystery shopper submissions" ON public.mystery_shopper_submissions;
DROP POLICY IF EXISTS "Public can create submissions for active templates" ON public.mystery_shopper_submissions;

-- Allow anyone to insert submissions (public form - no auth required)
CREATE POLICY "Public can submit mystery shopper forms"
ON public.mystery_shopper_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Ensure locations table can be read for submission (needed for location_id reference)
DROP POLICY IF EXISTS "Anyone can view locations for public forms" ON public.locations;

CREATE POLICY "Anyone can view locations for public forms"
ON public.locations
FOR SELECT
USING (true);