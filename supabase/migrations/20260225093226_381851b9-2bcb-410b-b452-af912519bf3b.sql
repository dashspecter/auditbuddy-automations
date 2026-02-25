CREATE POLICY "evidence_policies_delete_managers"
  ON public.evidence_policies FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );