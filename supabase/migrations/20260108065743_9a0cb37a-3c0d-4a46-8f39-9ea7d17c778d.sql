
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view audits based on role" ON public.location_audits;

-- Create improved policy that checks both platform roles and company roles
CREATE POLICY "Users can view audits based on role" 
ON public.location_audits 
FOR SELECT 
TO authenticated
USING (
  -- User owns the audit
  auth.uid() = user_id 
  -- OR user is platform admin/manager
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  -- OR user is a company admin/owner for the audit's company (via location)
  OR EXISTS (
    SELECT 1 FROM company_users cu
    JOIN locations l ON l.company_id = cu.company_id
    WHERE cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
    AND l.id = location_audits.location_id
  )
);
