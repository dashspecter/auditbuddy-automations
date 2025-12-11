-- Re-enable RLS and set up proper policies
ALTER TABLE public.mystery_shopper_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Public can submit mystery shopper forms" ON public.mystery_shopper_submissions;
DROP POLICY IF EXISTS "Users can view submissions in their company" ON public.mystery_shopper_submissions;
DROP POLICY IF EXISTS "Public can create vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Anyone can view vouchers by code" ON public.vouchers;
DROP POLICY IF EXISTS "Public can view vouchers by code" ON public.vouchers;
DROP POLICY IF EXISTS "Users can view vouchers in their company" ON public.vouchers;
DROP POLICY IF EXISTS "Managers can update vouchers" ON public.vouchers;

-- Create permissive policies for anonymous access (using anon role explicitly)
CREATE POLICY "Allow anonymous insert submissions"
ON public.mystery_shopper_submissions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated insert submissions"
ON public.mystery_shopper_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow company users to view their submissions
CREATE POLICY "Company users can view submissions"
ON public.mystery_shopper_submissions
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- Voucher policies
CREATE POLICY "Allow anonymous insert vouchers"
ON public.vouchers
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated insert vouchers"
ON public.vouchers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view vouchers"
ON public.vouchers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Company users can update vouchers"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));