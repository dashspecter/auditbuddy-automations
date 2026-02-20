
-- ============================================================
-- WhatsApp Business Integration – Database Foundation
-- ============================================================

-- 1. messaging_channels – Per-company Twilio configuration
CREATE TABLE public.messaging_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_type text NOT NULL DEFAULT 'whatsapp',
  provider text NOT NULL DEFAULT 'twilio',
  phone_number_e164 text,
  display_name text,
  twilio_account_sid text,
  twilio_auth_token_ref text,
  webhook_url text,
  webhook_secret text,
  status text NOT NULL DEFAULT 'pending',
  quality_rating text DEFAULT 'green',
  last_health_check timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, channel_type)
);

ALTER TABLE public.messaging_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage messaging channels"
  ON public.messaging_channels FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  );

-- 2. employee_messaging_preferences – Per-employee opt-in + settings
CREATE TABLE public.employee_messaging_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_e164 text,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  opt_in_at timestamptz,
  opt_in_source text DEFAULT 'manual',
  opted_out_at timestamptz,
  language text NOT NULL DEFAULT 'en',
  quiet_hours_start time,
  quiet_hours_end time,
  channel_priority text[] DEFAULT '{whatsapp,in_app}',
  max_messages_per_day int NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

ALTER TABLE public.employee_messaging_preferences ENABLE ROW LEVEL SECURITY;

-- Admins can manage all preferences in their company
CREATE POLICY "Admins can manage messaging preferences"
  ON public.employee_messaging_preferences FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  );

-- Employees can read/update their own preferences
CREATE POLICY "Employees can manage own messaging preferences"
  ON public.employee_messaging_preferences FOR ALL
  USING (
    employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid())
  );

-- 3. wa_message_templates – WhatsApp message templates
CREATE TABLE public.wa_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text NOT NULL DEFAULT 'utility',
  header_type text DEFAULT 'none',
  header_content text,
  body text NOT NULL,
  footer text,
  buttons jsonb DEFAULT '[]'::jsonb,
  variables_schema jsonb DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  provider_template_id text,
  approval_status text NOT NULL DEFAULT 'draft',
  rejection_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name, language, version)
);

ALTER TABLE public.wa_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage wa templates"
  ON public.wa_message_templates FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  );

-- 4. notification_rules – Event-to-channel routing
CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  template_id uuid REFERENCES public.wa_message_templates(id) ON DELETE SET NULL,
  target_roles text[] DEFAULT '{staff}',
  is_active boolean NOT NULL DEFAULT true,
  throttle_max_per_day int DEFAULT 20,
  escalation_after_minutes int,
  escalation_channel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, event_type, channel)
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage notification rules"
  ON public.notification_rules FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  );

-- 5. outbound_messages – Message queue + delivery tracking
CREATE TABLE public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  template_id uuid REFERENCES public.wa_message_templates(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.notification_rules(id) ON DELETE SET NULL,
  event_type text,
  event_ref_id uuid,
  recipient_phone_e164 text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  provider_message_sid text,
  error_code text,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read messages in their company
CREATE POLICY "Company admins can read outbound messages"
  ON public.outbound_messages FOR SELECT
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.user_is_manager_in_company(auth.uid(), company_id)
  );

-- Service role inserts (edge functions use service_role key)
-- No INSERT policy for authenticated users – edge functions use service role

-- 6. message_events – Webhook status log (audit trail)
CREATE TABLE public.message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.outbound_messages(id) ON DELETE CASCADE,
  status text NOT NULL,
  raw_provider_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can read message events"
  ON public.message_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outbound_messages om
      WHERE om.id = message_events.message_id
        AND om.company_id = public.get_user_company_id(auth.uid())
        AND public.user_is_manager_in_company(auth.uid(), om.company_id)
    )
  );

-- Indexes for performance
CREATE INDEX idx_outbound_messages_company_status ON public.outbound_messages(company_id, status);
CREATE INDEX idx_outbound_messages_retry ON public.outbound_messages(status, next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_outbound_messages_idempotency ON public.outbound_messages(idempotency_key);
CREATE INDEX idx_message_events_message_id ON public.message_events(message_id);
CREATE INDEX idx_employee_messaging_prefs_employee ON public.employee_messaging_preferences(employee_id);
CREATE INDEX idx_notification_rules_company_event ON public.notification_rules(company_id, event_type);

-- Updated_at triggers
CREATE TRIGGER update_messaging_channels_updated_at
  BEFORE UPDATE ON public.messaging_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_cmms_updated_at();

CREATE TRIGGER update_employee_messaging_preferences_updated_at
  BEFORE UPDATE ON public.employee_messaging_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_cmms_updated_at();

CREATE TRIGGER update_wa_message_templates_updated_at
  BEFORE UPDATE ON public.wa_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_cmms_updated_at();
