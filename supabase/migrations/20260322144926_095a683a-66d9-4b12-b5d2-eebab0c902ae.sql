
-- DASH COMMAND CENTER — Foundation Tables

-- 1. Dash conversation sessions
CREATE TABLE public.dash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dash sessions" ON public.dash_sessions FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE INDEX idx_dash_sessions_user ON public.dash_sessions(user_id, company_id, updated_at DESC);

-- 2. Dash user preferences
CREATE TABLE public.dash_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, preference_key)
);
ALTER TABLE public.dash_user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dash preferences" ON public.dash_user_preferences FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- 3. Dash organization memory
CREATE TABLE public.dash_org_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('vocabulary', 'process', 'convention', 'shortcut')),
  memory_key TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, memory_type, memory_key)
);
ALTER TABLE public.dash_org_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can read org memory" ON public.dash_org_memory FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins can manage org memory" ON public.dash_org_memory FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin')))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin')));

-- 4. Dash saved workflows
CREATE TABLE public.dash_saved_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workflow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dash_saved_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved workflows" ON public.dash_saved_workflows FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());

-- 5. Dash action audit log
CREATE TABLE public.dash_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID REFERENCES public.dash_sessions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('read', 'draft', 'write', 'file', 'approval')),
  action_name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  approval_status TEXT CHECK (approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  entities_affected JSONB DEFAULT '[]'::jsonb,
  modules_touched TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dash_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own action logs" ON public.dash_action_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Admins can view all company action logs" ON public.dash_action_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin')));
CREATE INDEX idx_dash_action_log_company ON public.dash_action_log(company_id, created_at DESC);
CREATE INDEX idx_dash_action_log_session ON public.dash_action_log(session_id);

-- 6. Dash pending actions
CREATE TABLE public.dash_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID REFERENCES public.dash_sessions(id) ON DELETE SET NULL,
  action_name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  preview_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dash_pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pending actions" ON public.dash_pending_actions FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Admins can view all pending actions" ON public.dash_pending_actions FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin')));
CREATE INDEX idx_dash_pending_actions_status ON public.dash_pending_actions(company_id, status, created_at DESC);
