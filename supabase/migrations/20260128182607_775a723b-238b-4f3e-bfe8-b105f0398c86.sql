-- Fix infinite recursion in training_sessions RLS by removing cross-table checks
-- and relying on security-definer helper functions.

BEGIN;

-- Replace SELECT policy (the attendee-based EXISTS can create recursion chains)
DROP POLICY IF EXISTS "Users can view training sessions for their company" ON public.training_sessions;
CREATE POLICY "Users can view training sessions for their company"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
);

-- Recreate manage policy using security-definer role helpers (no recursive joins)
DROP POLICY IF EXISTS "Managers can manage training sessions" ON public.training_sessions;
CREATE POLICY "Managers can manage training sessions"
ON public.training_sessions
FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_company_role(auth.uid(), 'company_owner')
    OR public.has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_company_role(auth.uid(), 'company_owner')
    OR public.has_company_role(auth.uid(), 'company_admin')
  )
);

COMMIT;