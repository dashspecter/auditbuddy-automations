import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface AgentPolicy {
  id: string;
  company_id: string;
  agent_type: string;
  policy_name: string;
  description: string | null;
  conditions_json: Array<{
    field: string;
    operator: ">" | "<" | "=" | ">=" | "<=" | "!=" | "contains" | "not_contains";
    value: unknown;
  }>;
  actions_json: Array<{
    action: string;
    params?: Record<string, unknown>;
  }>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  company_id: string;
  agent_type: string;
  goal: string;
  input_json: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "error";
  result_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflow {
  id: string;
  company_id: string;
  agent_type: string;
  goal: string;
  plan_json: Array<{
    step: number;
    action: string;
    status: "pending" | "completed" | "error";
    result?: unknown;
  }>;
  current_step: number;
  status: "pending" | "in_progress" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export interface AgentLog {
  id: string;
  company_id: string;
  agent_type: string;
  task_id: string | null;
  workflow_id: string | null;
  event_type: "decision" | "memory_read" | "memory_write" | "policy_match" | "workflow_step" | "error" | "info";
  details_json: Record<string, unknown>;
  occurred_at: string;
}

export interface AgentMemory {
  id: string;
  company_id: string;
  agent_type: string;
  memory_type: "observation" | "pattern" | "fact";
  content_json: Record<string, unknown>;
  created_at: string;
}

// Available agent types
export const AGENT_TYPES = [
  { value: "operations", label: "Operations Agent", description: "Manages daily operations and processes" },
  { value: "workforce", label: "Workforce Agent", description: "Handles staffing and scheduling" },
  { value: "finance", label: "Finance Agent", description: "Monitors financial metrics and budgets" },
  { value: "procurement", label: "Procurement Agent", description: "Manages suppliers and inventory" },
  { value: "compliance", label: "Compliance Agent", description: "Ensures regulatory compliance" },
];

// Policies CRUD
export const useAgentPolicies = (agentType?: string) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-policies", company?.id, agentType],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("agent_policies")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (agentType) {
        query = query.eq("agent_type", agentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentPolicy[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateAgentPolicy = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (policy: Omit<AgentPolicy, "id" | "company_id" | "created_at" | "updated_at">) => {
      if (!company?.id) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("agent_policies")
        .insert({ ...policy, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-policies"] });
      toast({ title: "Policy created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create policy", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateAgentPolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from("agent_policies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-policies"] });
      toast({ title: "Policy updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update policy", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteAgentPolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-policies"] });
      toast({ title: "Policy deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete policy", description: error.message, variant: "destructive" });
    },
  });
};

// Tasks
export const useAgentTasks = (agentType?: string, status?: string) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-tasks", company?.id, agentType, status],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("agent_tasks")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (agentType) query = query.eq("agent_type", agentType);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentTask[];
    },
    enabled: !!company?.id,
  });
};

// Workflows
export const useAgentWorkflows = (agentType?: string, status?: string) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-workflows", company?.id, agentType, status],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("agent_workflows")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (agentType) query = query.eq("agent_type", agentType);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentWorkflow[];
    },
    enabled: !!company?.id,
  });
};

export const useAgentWorkflowDetails = (workflowId: string) => {
  return useQuery({
    queryKey: ["agent-workflow", workflowId],
    queryFn: async () => {
      const { data: workflow, error: workflowError } = await supabase
        .from("agent_workflows")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (workflowError) throw workflowError;

      const { data: logs, error: logsError } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("occurred_at", { ascending: true });

      if (logsError) throw logsError;

      return { workflow: workflow as AgentWorkflow, logs: (logs || []) as AgentLog[] };
    },
    enabled: !!workflowId,
  });
};

// Logs
export const useAgentLogs = (filters?: { agentType?: string; eventType?: string; workflowId?: string; limit?: number }) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-logs", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("agent_logs")
        .select("*")
        .eq("company_id", company.id)
        .order("occurred_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.agentType) query = query.eq("agent_type", filters.agentType);
      if (filters?.eventType) query = query.eq("event_type", filters.eventType);
      if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentLog[];
    },
    enabled: !!company?.id,
  });
};

// Memory
export const useAgentMemory = (agentType?: string, memoryType?: string) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-memory", company?.id, agentType, memoryType],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("agent_memory")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (agentType) query = query.eq("agent_type", agentType);
      if (memoryType) query = query.eq("memory_type", memoryType);

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentMemory[];
    },
    enabled: !!company?.id,
  });
};

// Run Agent
export const useRunAgent = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      agent_type: string;
      goal: string;
      input?: Record<string, unknown>;
      mode?: "simulate" | "supervised" | "auto";
    }) => {
      if (!company?.id) throw new Error("No company selected");

      const response = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          company_id: company.id,
          ...params,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["agent-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["agent-logs"] });
      toast({ title: "Agent executed successfully", description: `Task ID: ${data.task_id}` });
    },
    onError: (error) => {
      toast({ title: "Agent execution failed", description: error.message, variant: "destructive" });
    },
  });
};

// Dashboard Stats
export const useAgentStats = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["agent-stats", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const [tasksResult, workflowsResult, policiesResult, logsResult] = await Promise.all([
        supabase.from("agent_tasks").select("status", { count: "exact" }).eq("company_id", company.id),
        supabase.from("agent_workflows").select("status", { count: "exact" }).eq("company_id", company.id),
        supabase.from("agent_policies").select("active", { count: "exact" }).eq("company_id", company.id),
        supabase
          .from("agent_logs")
          .select("event_type", { count: "exact" })
          .eq("company_id", company.id)
          .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        totalTasks: tasksResult.count || 0,
        totalWorkflows: workflowsResult.count || 0,
        activePolicies: policiesResult.data?.filter((p) => p.active).length || 0,
        logsLast24h: logsResult.count || 0,
      };
    },
    enabled: !!company?.id,
  });
};
