-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view audits based on role" ON location_audits;

-- Create updated SELECT policy that includes assigned_user_id
CREATE POLICY "Users can view audits based on role"
ON location_audits
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR
  (auth.uid() = assigned_user_id) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (EXISTS (
    SELECT 1
    FROM company_users cu
    JOIN locations l ON l.company_id = cu.company_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_role = ANY (ARRAY['company_owner', 'company_admin', 'manager']::text[])
      AND l.id = location_audits.location_id
  ))
);