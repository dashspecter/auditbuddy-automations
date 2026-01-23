-- Add 'hr' role to staff_events SELECT policy to match navigation permissions
DROP POLICY IF EXISTS "Admins managers checkers can view staff events" ON public.staff_events;

CREATE POLICY "Admins managers checkers hr can view staff events"
ON public.staff_events
FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'checker'::app_role) OR
    has_role(auth.uid(), 'hr'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR 
    has_company_role(auth.uid(), 'company_admin'::text)
  ))
);