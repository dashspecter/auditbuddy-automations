import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Audit {
  id: string;
  company_id: string;
  template_id: string;
  location_id: string;
  auditor_id: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  total_score: number | null;
  created_at: string;
  audit_templates?: {
    name: string;
  };
  locations?: {
    name: string;
  };
}

export const useAuditsNew = (locationId?: string, status?: string) => {
  return useQuery({
    queryKey: ["audits-new", locationId, status],
    queryFn: async () => {
      let query = supabase
        .from("audits")
        .select(`
          *,
          audit_templates(name),
          locations(name)
        `)
        .order("created_at", { ascending: false });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Audit[];
    },
  });
};

export const useAuditNew = (auditId?: string) => {
  return useQuery({
    queryKey: ["audit-new", auditId],
    queryFn: async () => {
      if (!auditId) return null;
      
      const { data, error } = await supabase
        .from("audits")
        .select(`
          *,
          audit_templates(name, description),
          locations(name)
        `)
        .eq("id", auditId)
        .single();
      
      if (error) throw error;
      return data as Audit;
    },
    enabled: !!auditId,
  });
};

const SESSION_EXPIRED_MSG = "Your session has expired. Please log in again.";

async function refreshAndGetUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw new Error(SESSION_EXPIRED_MSG);

  const { data: { user: refreshedUser } } = await supabase.auth.getUser();
  if (!refreshedUser) throw new Error("Not authenticated");
  return refreshedUser;
}

function handleMutationError(error: Error) {
  const message = error.message?.includes("row-level security")
    ? SESSION_EXPIRED_MSG
    : error.message;
  toast.error("Failed: " + message);
}

export const useCreateAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (audit: Omit<Audit, "id" | "created_at" | "company_id">) => {
      const user = await refreshAndGetUser();
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("audits")
        .insert({ ...audit, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits-new"] });
      toast.success("Audit created successfully");
    },
    onError: handleMutationError,
  });
};

export const useUpdateAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Audit> & { id: string }) => {
      await refreshAndGetUser();
      
      const { data, error } = await supabase
        .from("audits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits-new"] });
      queryClient.invalidateQueries({ queryKey: ["audit-new"] });
      toast.success("Audit updated successfully");
    },
    onError: handleMutationError,
  });
};

export const useCompleteAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ auditId, totalScore }: { auditId: string; totalScore: number }) => {
      await refreshAndGetUser();
      
      const { data, error } = await supabase
        .from("audits")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_score: totalScore,
        })
        .eq("id", auditId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits-new"] });
      queryClient.invalidateQueries({ queryKey: ["audit-new"] });
      toast.success("Audit completed successfully");
    },
    onError: handleMutationError,
  });
};
