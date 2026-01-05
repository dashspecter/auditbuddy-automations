-- Create junction table for assigning templates to checkers
CREATE TABLE public.audit_template_checkers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE (template_id, user_id)
);

-- Enable RLS
ALTER TABLE public.audit_template_checkers ENABLE ROW LEVEL SECURITY;

-- Policies: company admins/managers can manage assignments
CREATE POLICY "Users can view template assignments for their company" 
ON public.audit_template_checkers 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM audit_templates at
    JOIN company_users cu ON cu.company_id = at.company_id
    WHERE at.id = template_id AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can insert template assignments" 
ON public.audit_template_checkers 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM audit_templates at
    JOIN company_users cu ON cu.company_id = at.company_id
    WHERE at.id = template_id 
    AND cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
  )
);

CREATE POLICY "Managers can delete template assignments" 
ON public.audit_template_checkers 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM audit_templates at
    JOIN company_users cu ON cu.company_id = at.company_id
    WHERE at.id = template_id 
    AND cu.user_id = auth.uid()
    AND cu.company_role IN ('company_owner', 'company_admin', 'manager')
  )
);

-- Add index for faster lookups
CREATE INDEX idx_audit_template_checkers_template ON public.audit_template_checkers(template_id);
CREATE INDEX idx_audit_template_checkers_user ON public.audit_template_checkers(user_id);