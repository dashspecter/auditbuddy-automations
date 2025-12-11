-- Allow anonymous users to insert mystery shopper submissions (public form)
DROP POLICY IF EXISTS "Users can insert mystery shopper submissions" ON public.mystery_shopper_submissions;

CREATE POLICY "Anyone can insert mystery shopper submissions"
ON public.mystery_shopper_submissions
FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to insert vouchers (generated from submission)
DROP POLICY IF EXISTS "Users can insert vouchers" ON public.vouchers;

CREATE POLICY "Anyone can insert vouchers"
ON public.vouchers
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view their voucher by code (public voucher page)
DROP POLICY IF EXISTS "Anyone can view vouchers by code" ON public.vouchers;

CREATE POLICY "Anyone can view vouchers by code"
ON public.vouchers
FOR SELECT
USING (true);