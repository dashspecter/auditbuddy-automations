-- Allow authenticated users to create a new company during onboarding
CREATE POLICY "Authenticated users can create a company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);