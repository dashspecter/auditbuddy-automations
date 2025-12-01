-- Drop tables if they exist
DROP TABLE IF EXISTS public.api_call_logs CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;

-- Create webhook_logs table for tracking inbound webhooks
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  status_code INTEGER,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_company_id ON public.webhook_logs(company_id);
CREATE INDEX idx_webhook_logs_integration_id ON public.webhook_logs(integration_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_logs
CREATE POLICY "Admins can view webhook logs in their company"
  ON public.webhook_logs
  FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin'))
  );

CREATE POLICY "System can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true);

-- Create api_call_logs table for tracking outbound API calls
CREATE TABLE public.api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_api_call_logs_company_id ON public.api_call_logs(company_id);
CREATE INDEX idx_api_call_logs_integration_id ON public.api_call_logs(integration_id);
CREATE INDEX idx_api_call_logs_created_at ON public.api_call_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_call_logs
CREATE POLICY "Admins can view API call logs in their company"
  ON public.api_call_logs
  FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin'))
  );

CREATE POLICY "Admins can insert API call logs"
  ON public.api_call_logs
  FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_company_role(auth.uid(), 'company_admin'))
  );