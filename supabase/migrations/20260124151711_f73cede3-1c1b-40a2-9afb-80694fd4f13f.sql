-- Create AI Guide audit logs table for tracking AI queries and tool usage
CREATE TABLE public.ai_guide_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_preview TEXT,
  tools_used JSONB DEFAULT '[]'::jsonb,
  employee_ids JSONB DEFAULT '[]'::jsonb,
  pii_requested BOOLEAN DEFAULT false,
  pii_released BOOLEAN DEFAULT false,
  range_from DATE,
  range_to DATE
);

-- Create index for efficient querying
CREATE INDEX idx_ai_guide_audit_logs_company_id ON public.ai_guide_audit_logs(company_id);
CREATE INDEX idx_ai_guide_audit_logs_user_id ON public.ai_guide_audit_logs(user_id);
CREATE INDEX idx_ai_guide_audit_logs_created_at ON public.ai_guide_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_guide_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own logs
CREATE POLICY "Users can insert their own audit logs"
  ON public.ai_guide_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins and managers can view all logs in their company
CREATE POLICY "Admins and managers can view company audit logs"
  ON public.ai_guide_audit_logs
  FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Staff can only view their own logs
CREATE POLICY "Staff can view their own audit logs"
  ON public.ai_guide_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);