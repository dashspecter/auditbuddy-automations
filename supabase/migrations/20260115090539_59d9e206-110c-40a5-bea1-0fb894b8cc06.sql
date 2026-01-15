-- Drop the existing update policy
DROP POLICY IF EXISTS "Company users can update vouchers" ON public.vouchers;

-- Create a more inclusive policy that allows both company_users and employees to update vouchers
-- This covers both managers (in company_users) and staff (in employees)
CREATE POLICY "Company users and staff can update vouchers"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid()) 
  OR company_id IN (
    SELECT e.company_id 
    FROM public.employees e 
    WHERE e.user_id = auth.uid()
  )
);