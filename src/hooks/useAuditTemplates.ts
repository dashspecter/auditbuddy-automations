import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getToastError } from "@/lib/errorMessages";

export interface AuditTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  template_type: string;
  is_active: boolean;
  is_global: boolean;
  location_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  locations?: {
    name: string;
  };
}

export const useAuditTemplates = (locationId?: string, isGlobal?: boolean) => {
  return useQuery({
    queryKey: ["audit-templates", locationId, isGlobal],
    queryFn: async () => {
      let query = supabase
        .from("audit_templates")
        .select("*, locations(name)")
        .eq("is_active", true)
        .order("name");
      
      if (isGlobal !== undefined) {
        query = query.eq("is_global", isGlobal);
      }
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditTemplate[];
    },
  });
};

export const useAuditTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ["audit-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("audit_templates")
        .select("*, locations(name)")
        .eq("id", templateId)
        .single();
      
      if (error) throw error;
      return data as AuditTemplate;
    },
    enabled: !!templateId,
  });
};

export const useCreateAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<AuditTemplate, "id" | "created_at" | "updated_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("audit_templates")
        .insert({ ...template, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'templates');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useUpdateAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("audit_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-templates"] });
      queryClient.invalidateQueries({ queryKey: ["audit-template"] });
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'templates');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useDeleteAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("audit_templates")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'templates');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};
