-- Create billing status enum
CREATE TYPE billing_status AS ENUM ('active', 'past_due', 'paused');

-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM ('open', 'paid', 'failed');

-- Create subscription status enum  
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'paused', 'canceled');

-- Company billing table - stores NETOPIA credentials and billing state
CREATE TABLE public.company_billing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  netopia_binding_token text,
  status billing_status NOT NULL DEFAULT 'active',
  current_plan_id text,
  current_period_end timestamp with time zone,
  grace_period_ends_at timestamp with time zone,
  last_payment_error text,
  card_last_four text,
  card_brand text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  price_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RON',
  next_charge_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Billing invoices table
CREATE TABLE public.billing_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RON',
  status invoice_status NOT NULL DEFAULT 'open',
  netopia_order_id text,
  netopia_ntp_id text,
  attempt_count integer NOT NULL DEFAULT 1,
  description text,
  is_card_setup boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Billing events table for audit logging
CREATE TABLE public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  netopia_order_id text,
  netopia_ntp_id text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add is_paused and related columns to companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pause_reason text;

-- Enable RLS on all tables
ALTER TABLE public.company_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Company billing policies
CREATE POLICY "Company owners can view their billing"
  ON public.company_billing FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company owners can update their billing"
  ON public.company_billing FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) 
    AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

CREATE POLICY "System can insert billing records"
  ON public.company_billing FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Subscriptions policies
CREATE POLICY "Company users can view subscriptions"
  ON public.subscriptions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) 
    AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- Billing invoices policies
CREATE POLICY "Company users can view invoices"
  ON public.billing_invoices FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage invoices"
  ON public.billing_invoices FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) 
    AND (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin')));

-- Billing events policies
CREATE POLICY "Company users can view billing events"
  ON public.billing_events FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert billing events"
  ON public.billing_events FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Create indexes
CREATE INDEX idx_company_billing_company_id ON public.company_billing(company_id);
CREATE INDEX idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX idx_billing_invoices_company_id ON public.billing_invoices(company_id);
CREATE INDEX idx_billing_invoices_netopia_order_id ON public.billing_invoices(netopia_order_id);
CREATE INDEX idx_billing_events_company_id ON public.billing_events(company_id);

-- Trigger to update updated_at
CREATE TRIGGER update_company_billing_updated_at
  BEFORE UPDATE ON public.company_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at
  BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();