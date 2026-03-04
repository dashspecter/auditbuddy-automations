
-- Fix: Widen UPDATE policy to include platform managers/admins
DROP POLICY IF EXISTS "evidence_packets_update_reviewers" ON public.evidence_packets;

CREATE POLICY "evidence_packets_update_reviewers"
  ON public.evidence_packets FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND (
          cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );
