-- Step A: Fix evidence_policies RLS to include user_roles manager/admin

-- Drop existing restrictive policies
DROP POLICY IF EXISTS evidence_policies_insert_managers ON evidence_policies;
DROP POLICY IF EXISTS evidence_policies_update_managers ON evidence_policies;
DROP POLICY IF EXISTS evidence_policies_delete_managers ON evidence_policies;

-- Recreate with user_is_manager_in_company helper (covers company_role + user_roles)
CREATE POLICY "evidence_policies_insert_managers"
ON evidence_policies FOR INSERT TO authenticated
WITH CHECK (
  public.user_is_manager_in_company(auth.uid(), company_id)
);

CREATE POLICY "evidence_policies_update_managers"
ON evidence_policies FOR UPDATE TO authenticated
USING (
  public.user_is_manager_in_company(auth.uid(), company_id)
)
WITH CHECK (
  public.user_is_manager_in_company(auth.uid(), company_id)
);

CREATE POLICY "evidence_policies_delete_managers"
ON evidence_policies FOR DELETE TO authenticated
USING (
  public.user_is_manager_in_company(auth.uid(), company_id)
);