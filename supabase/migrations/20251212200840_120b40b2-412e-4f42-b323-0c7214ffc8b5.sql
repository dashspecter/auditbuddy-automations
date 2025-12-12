-- Add policy to allow company users to insert templates for their company
CREATE POLICY "Company users can create templates in their company"
ON public.audit_templates
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND auth.uid() = created_by
);

-- Add policy to allow company users to view templates in their company
CREATE POLICY "Company users can view templates in their company"
ON public.audit_templates
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
);

-- Also add UPDATE and DELETE for company admins/owners
CREATE POLICY "Company admins can update templates in their company"
ON public.audit_templates
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
);

CREATE POLICY "Company admins can delete templates in their company"
ON public.audit_templates
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
);