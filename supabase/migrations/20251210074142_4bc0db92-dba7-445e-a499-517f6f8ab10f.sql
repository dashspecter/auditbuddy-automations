-- Agent Foundation Layer Tables
-- Create only if they don't exist

-- 1. AgentMemory - stores observations, patterns, facts
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('observation', 'pattern', 'fact')),
  content_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. AgentPolicies - configurable rules for agents
CREATE TABLE IF NOT EXISTS public.agent_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  description TEXT,
  conditions_json JSONB NOT NULL DEFAULT '[]',
  actions_json JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. AgentTasks - individual tasks executed by agents
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  goal TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. AgentWorkflows - multi-step plans
CREATE TABLE IF NOT EXISTS public.agent_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  goal TEXT NOT NULL,
  plan_json JSONB NOT NULL DEFAULT '[]',
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. AgentLogs - detailed event logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.agent_workflows(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('decision', 'memory_read', 'memory_write', 'policy_match', 'workflow_step', 'error', 'info')),
  details_json JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_memory_company ON public.agent_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON public.agent_memory(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_policies_company ON public.agent_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_policies_active ON public.agent_policies(company_id, agent_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_company ON public.agent_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_company ON public.agent_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_status ON public.agent_workflows(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_company ON public.agent_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_type ON public.agent_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_occurred ON public.agent_logs(occurred_at DESC);

-- Enable RLS
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Company admins and owners can manage agent data
CREATE POLICY "Users can view agent memory in their company"
  ON public.agent_memory FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage agent memory"
  ON public.agent_memory FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND (has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner')));

CREATE POLICY "Users can view agent policies in their company"
  ON public.agent_policies FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage agent policies"
  ON public.agent_policies FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND (has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner')));

CREATE POLICY "Users can view agent tasks in their company"
  ON public.agent_tasks FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage agent tasks"
  ON public.agent_tasks FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND (has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner')));

CREATE POLICY "Users can view agent workflows in their company"
  ON public.agent_workflows FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage agent workflows"
  ON public.agent_workflows FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND (has_company_role(auth.uid(), 'company_admin') OR has_company_role(auth.uid(), 'company_owner')));

CREATE POLICY "Users can view agent logs in their company"
  ON public.agent_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert agent logs"
  ON public.agent_logs FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_agent_policies_updated_at
  BEFORE UPDATE ON public.agent_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_workflows_updated_at
  BEFORE UPDATE ON public.agent_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();