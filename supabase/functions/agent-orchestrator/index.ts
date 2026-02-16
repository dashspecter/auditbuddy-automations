import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Auth helper: validate JWT, check company membership & admin/manager role
async function authenticateAndAuthorize(req: Request, requiredCompanyId?: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing or invalid Authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  const userId = claimsData.claims.sub as string;

  // Check company membership if a company_id is required
  if (requiredCompanyId) {
    const serviceClient = getSupabase();
    const { data: membership, error: memError } = await serviceClient
      .from("company_users")
      .select("company_role")
      .eq("user_id", userId)
      .eq("company_id", requiredCompanyId)
      .single();

    if (memError || !membership) {
      throw { status: 403, message: "You do not belong to this company" };
    }

    const allowedRoles = ["company_owner", "company_admin"];
    if (!allowedRoles.includes((membership as any).company_role)) {
      // Also check platform admin role
      const { data: platformRoles } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const isAdmin = (platformRoles || []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        throw { status: 403, message: "Insufficient permissions. Admin or owner role required." };
      }
    }
  }

  return userId;
}

// Types
interface PolicyCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface Policy {
  id: string;
  policy_name: string;
  conditions_json: PolicyCondition[];
  actions_json: { action: string; params?: Record<string, unknown> }[];
}

interface DecisionResult {
  action: string;
  applied_policies: string[];
  memory_used: string[];
  reasoning: string;
  params?: Record<string, unknown>;
}

interface WorkflowStep {
  step: number;
  action: string;
  status: string;
  result?: unknown;
}

// Helper to create typed supabase client
const getSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
};

// AgentMemoryService
const AgentMemoryService = {
  async storeMemory(companyId: string, agentType: string, memoryType: string, content: Record<string, unknown>) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_memory")
      .insert({ company_id: companyId, agent_type: agentType, memory_type: memoryType, content_json: content } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async fetchRelevantMemory(companyId: string, agentType: string, limit = 20) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_memory")
      .select("*")
      .eq("company_id", companyId)
      .eq("agent_type", agentType)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as any[];
  },
};

// PolicyEngine
const PolicyEngine = {
  async getActivePolicies(companyId: string, agentType: string): Promise<Policy[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_policies")
      .select("*")
      .eq("company_id", companyId)
      .eq("agent_type", agentType)
      .eq("active", true);
    if (error) throw error;
    return (data || []) as Policy[];
  },

  evaluateCondition(entityData: Record<string, unknown>, condition: PolicyCondition): boolean {
    const fieldValue = entityData[condition.field];
    const targetValue = condition.value;
    switch (condition.operator) {
      case ">": return Number(fieldValue) > Number(targetValue);
      case "<": return Number(fieldValue) < Number(targetValue);
      case "=": return fieldValue === targetValue;
      case "contains": return typeof fieldValue === "string" && typeof targetValue === "string" && fieldValue.toLowerCase().includes(targetValue.toLowerCase());
      default: return false;
    }
  },

  evaluatePolicies(entityData: Record<string, unknown>, policies: Policy[]) {
    const matchedPolicies: Policy[] = [];
    const resultingActions: { action: string; params?: Record<string, unknown>; policy_name: string }[] = [];

    for (const policy of policies) {
      const conditions = policy.conditions_json || [];
      const allMatch = conditions.every((c) => this.evaluateCondition(entityData, c));
      if (allMatch) {
        matchedPolicies.push(policy);
        for (const action of policy.actions_json || []) {
          resultingActions.push({ action: action.action, params: action.params, policy_name: policy.policy_name });
        }
      }
    }
    return { matched_policies: matchedPolicies, resulting_actions: resultingActions };
  },
};

// DecisionEngine
const DecisionEngine = {
  async decideNextAction(companyId: string, agentType: string, goal: string, input: Record<string, unknown>): Promise<DecisionResult> {
    const memories = await AgentMemoryService.fetchRelevantMemory(companyId, agentType, 20);
    const policies = await PolicyEngine.getActivePolicies(companyId, agentType);
    const { matched_policies, resulting_actions } = PolicyEngine.evaluatePolicies(input, policies);

    let decision: DecisionResult;
    if (resulting_actions.length > 0) {
      const primaryAction = resulting_actions[0];
      decision = {
        action: primaryAction.action,
        applied_policies: matched_policies.map((p) => p.policy_name),
        memory_used: memories.slice(0, 5).map((m: any) => m.id),
        reasoning: `Policy "${primaryAction.policy_name}" matched. Executing: ${primaryAction.action}`,
        params: primaryAction.params,
      };
    } else {
      decision = {
        action: "analyze",
        applied_policies: [],
        memory_used: memories.slice(0, 5).map((m: any) => m.id),
        reasoning: `No policies matched. Default action for goal: ${goal}`,
      };
    }

    const supabase = getSupabase();
    await supabase.from("agent_logs").insert({
      company_id: companyId, agent_type: agentType, event_type: "decision",
      details_json: { goal, decision, policies_evaluated: policies.length },
    } as any);

    return decision;
  },
};

// WorkflowEngine
const WorkflowEngine = {
  async createPlan(companyId: string, agentType: string, goal: string) {
    const steps: WorkflowStep[] = [
      { step: 1, action: "gather_context", status: "pending" },
      { step: 2, action: "evaluate_policies", status: "pending" },
      { step: 3, action: "execute_decision", status: "pending" },
      { step: 4, action: "store_results", status: "pending" },
    ];

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_workflows")
      .insert({ company_id: companyId, agent_type: agentType, goal, plan_json: steps, status: "pending" } as any)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("agent_logs").insert({
      company_id: companyId, agent_type: agentType, workflow_id: (data as any).id,
      event_type: "workflow_step", details_json: { action: "workflow_created", goal },
    } as any);

    return data as any;
  },

  async executeNextStep(workflowId: string) {
    const supabase = getSupabase();
    const { data: workflow, error } = await supabase.from("agent_workflows").select("*").eq("id", workflowId).single();
    if (error || !workflow) throw new Error("Workflow not found");

    const wf = workflow as any;
    const steps: WorkflowStep[] = wf.plan_json || [];
    if (wf.current_step >= steps.length) {
      await supabase.from("agent_workflows").update({ status: "completed" } as any).eq("id", workflowId);
      return { status: "completed", workflow: wf };
    }

    const currentStep = steps[wf.current_step];
    currentStep.status = "completed";
    currentStep.result = { executed_at: new Date().toISOString() };

    const newStep = wf.current_step + 1;
    const { data: updated } = await supabase.from("agent_workflows")
      .update({ plan_json: steps, current_step: newStep, status: newStep >= steps.length ? "completed" : "in_progress" } as any)
      .eq("id", workflowId).select().single();

    await supabase.from("agent_logs").insert({
      company_id: wf.company_id, agent_type: wf.agent_type, workflow_id: workflowId,
      event_type: "workflow_step", details_json: { step: currentStep.step, action: currentStep.action },
    } as any);

    return { status: "step_completed", step: currentStep, workflow: updated };
  },
};

// AgentOrchestrator
const AgentOrchestrator = {
  async runAgent(companyId: string, agentType: string, goal: string, input: Record<string, unknown>, mode: string) {
    const supabase = getSupabase();
    const { data: task, error } = await supabase.from("agent_tasks")
      .insert({ company_id: companyId, agent_type: agentType, goal, input_json: input, status: "running" } as any)
      .select().single();
    if (error) throw error;

    const taskData = task as any;
    try {
      const decision = await DecisionEngine.decideNextAction(companyId, agentType, goal, input);
      await AgentMemoryService.storeMemory(companyId, agentType, "observation", { goal, decision_action: decision.action });

      if (mode === "simulate") {
        await supabase.from("agent_tasks").update({ status: "completed", result_json: { mode, decision, executed: false } } as any).eq("id", taskData.id);
        return { task_id: taskData.id, mode, decision, executed: false };
      }

      const workflow = await WorkflowEngine.createPlan(companyId, agentType, goal);
      if (mode === "auto") {
        let result;
        do { result = await WorkflowEngine.executeNextStep(workflow.id); } while (result.status === "step_completed");
      }

      await supabase.from("agent_tasks").update({ status: "completed", result_json: { mode, decision, workflow_id: workflow.id, executed: mode === "auto" } } as any).eq("id", taskData.id);
      return { task_id: taskData.id, mode, decision, workflow_id: workflow.id, executed: mode === "auto" };
    } catch (err) {
      await supabase.from("agent_tasks").update({ status: "error", result_json: { error: String(err) } } as any).eq("id", taskData.id);
      throw err;
    }
  },
};

// HTTP Handler
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/agent-orchestrator", "");

    if (req.method === "POST" && (path === "/run" || path === "" || path === "/")) {
      const { company_id, agent_type, goal, input, mode = "simulate" } = await req.json();
      if (!company_id || !agent_type || !goal) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await authenticateAndAuthorize(req, company_id);
      const result = await AgentOrchestrator.runAgent(company_id, agent_type, goal, input || {}, mode);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "GET" && path === "/logs") {
      const companyId = url.searchParams.get("company_id");
      if (!companyId) {
        return new Response(JSON.stringify({ error: "company_id query param required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await authenticateAndAuthorize(req, companyId);
      const supabase = getSupabase();
      let query = supabase.from("agent_logs").select("*").order("occurred_at", { ascending: false }).limit(100);
      query = query.eq("company_id", companyId);
      const { data } = await query;
      return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    const status = error?.status || 500;
    const message = error?.message || String(error);
    console.error("[agent-orchestrator] Error:", message);
    return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
