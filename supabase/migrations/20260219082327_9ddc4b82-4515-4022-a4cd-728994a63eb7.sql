-- Fix: Allow company_member role to also create/update/delete CA rules
-- (company_member in this app means manager-level access)
-- Currently only company_owner and company_admin can INSERT/UPDATE/DELETE rules,
-- but Vlad (vlad@lbfc.ro) has company_member role and needs this access.

DROP POLICY IF EXISTS car_insert ON public.corrective_action_rules;
DROP POLICY IF EXISTS car_update ON public.corrective_action_rules;
DROP POLICY IF EXISTS car_delete ON public.corrective_action_rules;

-- Recreate to match the same pattern as car_select (user_is_manager_in_company)
CREATE POLICY car_insert ON public.corrective_action_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    user_is_manager_in_company(auth.uid(), company_id)
  );

CREATE POLICY car_update ON public.corrective_action_rules
  FOR UPDATE TO authenticated
  USING (
    user_is_manager_in_company(auth.uid(), company_id)
  );

CREATE POLICY car_delete ON public.corrective_action_rules
  FOR DELETE TO authenticated
  USING (
    user_is_manager_in_company(auth.uid(), company_id)
  );