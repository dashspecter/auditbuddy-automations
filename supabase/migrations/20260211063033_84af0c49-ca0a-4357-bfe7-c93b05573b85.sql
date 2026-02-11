-- Allow company admins/owners to view task completions for their company's tasks
-- This fixes the admin dashboard showing tasks as "Pending" even when completed

CREATE POLICY "Company admins can view all completions"
  ON public.task_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.company_users cu ON cu.company_id = t.company_id
      WHERE t.id = task_completions.task_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_admin', 'company_owner', 'company_manager')
    )
  );
