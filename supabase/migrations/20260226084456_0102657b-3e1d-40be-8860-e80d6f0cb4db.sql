
-- 1. Add 'scout' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scout';

-- 2. scout_disputes table
CREATE TABLE public.scout_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES public.scouts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  resolution_notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_scout_dispute_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'under_review', 'closed') THEN
    RAISE EXCEPTION 'Invalid dispute status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_scout_dispute_status
  BEFORE INSERT OR UPDATE ON public.scout_disputes
  FOR EACH ROW EXECUTE FUNCTION public.validate_scout_dispute_status();

ALTER TABLE public.scout_disputes ENABLE ROW LEVEL SECURITY;

-- Scouts can insert their own disputes
CREATE POLICY "Scouts can insert own disputes"
  ON public.scout_disputes FOR INSERT TO authenticated
  WITH CHECK (scout_id = public.get_scout_id(auth.uid()));

-- Scouts can view own disputes
CREATE POLICY "Scouts can view own disputes"
  ON public.scout_disputes FOR SELECT TO authenticated
  USING (scout_id = public.get_scout_id(auth.uid()));

-- Org managers can view disputes for their company jobs
CREATE POLICY "Managers can view company disputes"
  ON public.scout_disputes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_jobs sj
      JOIN public.company_users cu ON cu.company_id = sj.company_id
      WHERE sj.id = scout_disputes.job_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin')
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Platform admin full access
CREATE POLICY "Admin full access disputes"
  ON public.scout_disputes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. scout_audit_log table
CREATE TABLE public.scout_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_audit_log_entity ON public.scout_audit_log(entity_type, entity_id);
CREATE INDEX idx_scout_audit_log_actor ON public.scout_audit_log(actor_user_id);

ALTER TABLE public.scout_audit_log ENABLE ROW LEVEL SECURITY;

-- Platform admin full access
CREATE POLICY "Admin full access audit log"
  ON public.scout_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Scouts can view own actions
CREATE POLICY "Scouts can view own audit log"
  ON public.scout_audit_log FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

-- Managers can view audit log for their company entities
CREATE POLICY "Managers can view company audit log"
  ON public.scout_audit_log FOR SELECT TO authenticated
  USING (
    entity_type = 'job' AND EXISTS (
      SELECT 1 FROM public.scout_jobs sj
      JOIN public.company_users cu ON cu.company_id = sj.company_id
      WHERE sj.id = scout_audit_log.entity_id
        AND cu.user_id = auth.uid()
    )
  );

-- Anyone authenticated can insert (edge functions insert on behalf of users)
CREATE POLICY "Authenticated can insert audit log"
  ON public.scout_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- 4. Add packet_storage_path to scout_submissions
ALTER TABLE public.scout_submissions ADD COLUMN IF NOT EXISTS packet_storage_path TEXT;

-- 5. register_scout RPC
CREATE OR REPLACE FUNCTION public.register_scout(
  p_invite_token TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_scout_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate invite token
  SELECT * INTO v_invite
  FROM public.scout_invites
  WHERE token = p_invite_token
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Mark invite as used
  UPDATE public.scout_invites
  SET used_at = now(), used_by_user_id = v_user_id
  WHERE id = v_invite.id;

  -- Create scouts record
  INSERT INTO public.scouts (
    user_id, full_name, phone, city, status, company_id
  ) VALUES (
    v_user_id, p_full_name, p_phone, p_city, 'pending', v_invite.company_id
  )
  RETURNING id INTO v_scout_id;

  -- Create user_roles record with scout role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'scout')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_scout_id;
END;
$$;
