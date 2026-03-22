
-- P1-3: Fix memory_type CHECK constraint to include all valid values
ALTER TABLE public.dash_org_memory DROP CONSTRAINT IF EXISTS dash_org_memory_memory_type_check;
ALTER TABLE public.dash_org_memory ADD CONSTRAINT dash_org_memory_memory_type_check 
  CHECK (memory_type IN ('vocabulary','process','convention','shortcut','terminology','standard','note'));

-- P1-4: Add is_shared column to dash_saved_workflows
ALTER TABLE public.dash_saved_workflows 
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

-- P2-5: Add SELECT policy for shared workflows visible to company members
CREATE POLICY "Company members can view shared workflows" 
  ON public.dash_saved_workflows FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND is_shared = true);
