-- Fix equipment_documents RLS policy to allow company_admin/owner roles
DROP POLICY IF EXISTS "Admins and managers can manage documents" ON public.equipment_documents;

CREATE POLICY "Admins and managers can manage documents"
ON public.equipment_documents
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Fix equipment_interventions RLS policy to allow company_admin/owner roles
DROP POLICY IF EXISTS "Admins and managers can manage interventions" ON public.equipment_interventions;

CREATE POLICY "Admins and managers can manage interventions"
ON public.equipment_interventions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_company_role(auth.uid(), 'company_admin'::text)
  OR has_company_role(auth.uid(), 'company_owner'::text)
);

-- Fix equipment_checks RLS policy for update to allow company_admin/owner roles
DROP POLICY IF EXISTS "Managers can update equipment checks" ON public.equipment_checks;

CREATE POLICY "Managers can update equipment checks"
ON public.equipment_checks
FOR UPDATE
USING (
  (EXISTS ( SELECT 1
   FROM equipment e
   WHERE ((e.id = equipment_checks.equipment_id) AND (e.company_id = get_user_company_id(auth.uid()))))) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_company_role(auth.uid(), 'company_admin'::text)
    OR has_company_role(auth.uid(), 'company_owner'::text)
  )
);