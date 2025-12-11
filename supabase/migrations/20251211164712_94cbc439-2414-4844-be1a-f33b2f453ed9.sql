-- Drop and recreate the policy for ALL roles including public
DROP POLICY IF EXISTS "Public can submit mystery shopper forms" ON public.mystery_shopper_submissions;

CREATE POLICY "Public can submit mystery shopper forms"
ON public.mystery_shopper_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Also ensure vouchers insert policy covers all roles
DROP POLICY IF EXISTS "Anyone can insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Public can create vouchers via submission" ON public.vouchers;

CREATE POLICY "Public can create vouchers"
ON public.vouchers
FOR INSERT
TO public
WITH CHECK (true);