-- Fix: Add HR role to payroll RLS policies

-- 1. payroll_periods
DROP POLICY "Company admins can manage payroll periods" ON public.payroll_periods;

CREATE POLICY "Company roles can manage payroll periods"
ON public.payroll_periods FOR ALL
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'hr') OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'hr') OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin')
  )
);

-- 2. payroll_items: drop both policies and recreate with hr
DROP POLICY "Managers can manage payroll items" ON public.payroll_items;
DROP POLICY "Managers can view payroll items" ON public.payroll_items;

CREATE POLICY "Company roles can manage payroll items"
ON public.payroll_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM payroll_periods pp
    WHERE pp.id = payroll_items.period_id
      AND pp.company_id = get_user_company_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'manager') OR
        has_role(auth.uid(), 'hr') OR
        has_company_role(auth.uid(), 'company_owner') OR
        has_company_role(auth.uid(), 'company_admin')
      )
  )
);