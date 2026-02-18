
-- ============================================================
-- CAPA-lite: Corrective Action System
-- ============================================================

-- 1. corrective_actions table
CREATE TABLE public.corrective_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id         uuid NOT NULL REFERENCES public.locations(id),
  source_type         text NOT NULL CHECK (source_type IN ('audit_item_result', 'incident', 'asset_downtime', 'manual')),
  source_id           uuid NOT NULL,
  title               text NOT NULL,
  description         text,
  severity            text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_verification', 'closed', 'reopened', 'cancelled')),
  owner_user_id       uuid,
  owner_role          text,
  due_at              timestamptz NOT NULL,
  requires_approval   boolean NOT NULL DEFAULT false,
  approval_role       text,
  approved_by         uuid,
  approved_at         timestamptz,
  closed_at           timestamptz,
  stop_the_line       boolean NOT NULL DEFAULT false,
  stop_released_by    uuid,
  stop_released_at    timestamptz,
  stop_release_reason text,
  created_by          uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. corrective_action_items table
CREATE TABLE public.corrective_action_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  corrective_action_id   uuid NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  instructions           text,
  assignee_user_id       uuid,
  assignee_role          text,
  due_at                 timestamptz NOT NULL,
  status                 text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'verified', 'rejected')),
  evidence_required      boolean NOT NULL DEFAULT true,
  evidence_packet_id     uuid,
  completed_by           uuid,
  completed_at           timestamptz,
  verified_by            uuid,
  verified_at            timestamptz,
  verification_notes     text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- 3. corrective_action_events (append-only audit trail)
CREATE TABLE public.corrective_action_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  corrective_action_id uuid NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  actor_id             uuid NOT NULL,
  event_type           text NOT NULL,
  payload              jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- 4. corrective_action_rules
CREATE TABLE public.corrective_action_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name           text NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  trigger_type   text NOT NULL CHECK (trigger_type IN ('audit_fail', 'incident_repeat', 'asset_downtime_pattern')),
  trigger_config jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);

-- 5. location_risk_state (stop-the-line)
CREATE TABLE public.location_risk_state (
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id       uuid NOT NULL REFERENCES public.locations(id),
  is_restricted     boolean NOT NULL DEFAULT false,
  restricted_reason text,
  restricted_ca_id  uuid REFERENCES public.corrective_actions(id),
  updated_at        timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, location_id)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_ca_company_location_status ON public.corrective_actions(company_id, location_id, status);
CREATE INDEX idx_ca_company_due ON public.corrective_actions(company_id, due_at);
CREATE INDEX idx_ca_source ON public.corrective_actions(source_type, source_id);
CREATE INDEX idx_cai_ca_status ON public.corrective_action_items(corrective_action_id, status);
CREATE INDEX idx_cae_ca_created ON public.corrective_action_events(corrective_action_id, created_at);
CREATE INDEX idx_car_company ON public.corrective_action_rules(company_id, enabled);

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_corrective_action_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ca_updated_at
BEFORE UPDATE ON public.corrective_actions
FOR EACH ROW EXECUTE FUNCTION public.update_corrective_action_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_action_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_action_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_risk_state ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is in a company
CREATE OR REPLACE FUNCTION public.user_in_company(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users cu WHERE cu.user_id = _user_id AND cu.company_id = _company_id
    UNION
    SELECT 1 FROM public.employees e WHERE e.user_id = _user_id AND e.company_id = _company_id
  )
$$;

-- Helper: check if user is manager/admin in a company
CREATE OR REPLACE FUNCTION public.user_is_manager_in_company(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = _user_id
      AND cu.company_id = _company_id
      AND cu.company_role IN ('company_owner', 'company_admin', 'company_member')
  ) OR public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'manager'::app_role)
$$;

-- ── corrective_actions ──────────────────────────────────────

CREATE POLICY "ca_select" ON public.corrective_actions
  FOR SELECT TO authenticated
  USING (public.user_in_company(auth.uid(), company_id));

CREATE POLICY "ca_insert" ON public.corrective_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "ca_update" ON public.corrective_actions
  FOR UPDATE TO authenticated
  USING (public.user_is_manager_in_company(auth.uid(), company_id))
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

-- No DELETE policy → blocked by default

-- ── corrective_action_items ─────────────────────────────────

CREATE POLICY "cai_select" ON public.corrective_action_items
  FOR SELECT TO authenticated
  USING (public.user_in_company(auth.uid(), company_id));

CREATE POLICY "cai_insert" ON public.corrective_action_items
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "cai_update" ON public.corrective_action_items
  FOR UPDATE TO authenticated
  USING (
    public.user_is_manager_in_company(auth.uid(), company_id)
    OR assignee_user_id = auth.uid()
  )
  WITH CHECK (
    public.user_is_manager_in_company(auth.uid(), company_id)
    OR assignee_user_id = auth.uid()
  );

-- No DELETE policy → blocked

-- ── corrective_action_events (append-only) ──────────────────

CREATE POLICY "cae_select" ON public.corrective_action_events
  FOR SELECT TO authenticated
  USING (public.user_in_company(auth.uid(), company_id));

CREATE POLICY "cae_insert" ON public.corrective_action_events
  FOR INSERT TO authenticated
  WITH CHECK (public.user_in_company(auth.uid(), company_id));

-- No UPDATE, no DELETE → tamper-evident

-- ── corrective_action_rules ─────────────────────────────────

CREATE POLICY "car_select" ON public.corrective_action_rules
  FOR SELECT TO authenticated
  USING (public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "car_insert" ON public.corrective_action_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "car_update" ON public.corrective_action_rules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "car_delete" ON public.corrective_action_rules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.company_role IN ('company_owner', 'company_admin')
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ── location_risk_state ─────────────────────────────────────

CREATE POLICY "lrs_select" ON public.location_risk_state
  FOR SELECT TO authenticated
  USING (public.user_in_company(auth.uid(), company_id));

CREATE POLICY "lrs_insert" ON public.location_risk_state
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

CREATE POLICY "lrs_update" ON public.location_risk_state
  FOR UPDATE TO authenticated
  USING (public.user_is_manager_in_company(auth.uid(), company_id))
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

-- No DELETE policy
