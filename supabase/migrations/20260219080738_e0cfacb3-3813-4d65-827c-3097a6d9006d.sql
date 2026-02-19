-- Fix broken RLS policies on corrective_action_rules
-- The INSERT and DELETE policies had cu.company_id = cu.company_id (self-join, always true)
-- which doesn't actually validate company ownership properly

DROP POLICY IF EXISTS car_insert ON public.corrective_action_rules;
DROP POLICY IF EXISTS car_update ON public.corrective_action_rules;
DROP POLICY IF EXISTS car_delete ON public.corrective_action_rules;

-- Recreate INSERT: user must be company_owner or company_admin of the same company they're inserting for
CREATE POLICY car_insert ON public.corrective_action_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = corrective_action_rules.company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Recreate UPDATE
CREATE POLICY car_update ON public.corrective_action_rules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = corrective_action_rules.company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Recreate DELETE
CREATE POLICY car_delete ON public.corrective_action_rules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = corrective_action_rules.company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );