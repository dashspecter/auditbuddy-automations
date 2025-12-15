-- Drop old policies that use incorrect role checks
DROP POLICY IF EXISTS "Admins and managers can manage categories" ON public.document_categories;
DROP POLICY IF EXISTS "All authenticated users can view categories" ON public.document_categories;

-- Create new policies using company-based access control
CREATE POLICY "Company users can view their categories" 
ON public.document_categories 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company admins and owners can manage categories" 
ON public.document_categories 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() 
    AND company_role IN ('company_admin', 'company_owner')
  )
);

CREATE POLICY "Company admins and owners can update categories" 
ON public.document_categories 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() 
    AND company_role IN ('company_admin', 'company_owner')
  )
);

CREATE POLICY "Company admins and owners can delete categories" 
ON public.document_categories 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() 
    AND company_role IN ('company_admin', 'company_owner')
  )
);