import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ApprovalWorkflowStep {
  step_order: number;
  role: string;
  label: string;
}

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  entity_type: string;
  steps: ApprovalWorkflowStep[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string;
  current_step: number;
  status: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
  workflow?: ApprovalWorkflow;
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  step_order: number;
  decided_by: string;
  decision: string;
  comment: string | null;
  decided_at: string;
}

export const useApprovalWorkflows = () => {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ["approval_workflows", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_workflows" as any)
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ApprovalWorkflow[];
    },
    enabled: !!company?.id,
  });
};

export const useApprovalRequests = (status?: string) => {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ["approval_requests", company?.id, status],
    queryFn: async () => {
      let query = supabase
        .from("approval_requests" as any)
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch associated workflows
      const requests = (data || []) as unknown as ApprovalRequest[];
      if (requests.length === 0) return requests;

      const workflowIds = [...new Set(requests.map((r) => r.workflow_id))];
      const { data: workflows } = await supabase
        .from("approval_workflows" as any)
        .select("*")
        .in("id", workflowIds);

      const workflowMap = new Map(
        ((workflows || []) as unknown as ApprovalWorkflow[]).map((w) => [w.id, w])
      );

      return requests.map((r) => ({
        ...r,
        workflow: workflowMap.get(r.workflow_id),
      }));
    },
    enabled: !!company?.id,
  });
};

export const useApprovalDecisions = (requestId?: string) => {
  return useQuery({
    queryKey: ["approval_decisions", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_decisions" as any)
        .select("*")
        .eq("request_id", requestId!)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ApprovalDecision[];
    },
    enabled: !!requestId,
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      entity_type: string;
      steps: ApprovalWorkflowStep[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("approval_workflows" as any)
        .insert({
          company_id: company!.id,
          name: input.name,
          description: input.description || null,
          entity_type: input.entity_type,
          steps: JSON.stringify(input.steps),
          created_by: userData.user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_workflows"] });
      toast.success("Workflow created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create workflow");
    },
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description?: string;
      entity_type: string;
      steps: ApprovalWorkflowStep[];
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from("approval_workflows" as any)
        .update({
          name: input.name,
          description: input.description || null,
          entity_type: input.entity_type,
          steps: JSON.stringify(input.steps),
          is_active: input.is_active,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_workflows"] });
      toast.success("Workflow updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update workflow");
    },
  });
};

export const useCreateApprovalRequest = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (input: {
      workflow_id: string;
      entity_type: string;
      entity_id?: string;
      entity_title: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("approval_requests" as any)
        .insert({
          company_id: company!.id,
          workflow_id: input.workflow_id,
          entity_type: input.entity_type,
          entity_id: input.entity_id || null,
          entity_title: input.entity_title,
          requested_by: userData.user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      toast.success("Approval request submitted");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request");
    },
  });
};

export const useApproveOrReject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      step_order: number;
      decision: "approved" | "rejected";
      comment?: string;
    }) => {
      const { data, error } = await supabase.rpc("process_approval_decision", {
        p_request_id: input.request_id,
        p_step_order: input.step_order,
        p_decision: input.decision,
        p_comment: input.comment || null,
      });
      if (error) throw error;
      return data as { new_status: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["approval_requests"] });
      queryClient.invalidateQueries({ queryKey: ["approval_decisions"] });
      toast.success(
        result.new_status === "approved"
          ? "Request fully approved"
          : result.new_status === "rejected"
          ? "Request rejected"
          : "Step approved, forwarded to next approver"
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process decision");
    },
  });
};
