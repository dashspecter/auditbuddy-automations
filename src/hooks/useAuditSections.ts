import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AuditSection {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useAuditSections = (templateId?: string) => {
  return useQuery({
    queryKey: ["audit-sections", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("audit_sections")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order");
      
      if (error) throw error;
      return data as AuditSection[];
    },
    enabled: !!templateId,
  });
};

export const useCreateAuditSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (section: Omit<AuditSection, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("audit_sections")
        .insert(section)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["audit-sections", variables.template_id] });
      toast.success("Section created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create section: " + error.message);
    },
  });
};

export const useUpdateAuditSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, template_id, ...updates }: Partial<AuditSection> & { id: string; template_id: string }) => {
      const { data, error } = await supabase
        .from("audit_sections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, template_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["audit-sections", result.template_id] });
      toast.success("Section updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update section: " + error.message);
    },
  });
};

export const useDeleteAuditSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, template_id }: { id: string; template_id: string }) => {
      const { error } = await supabase
        .from("audit_sections")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return template_id;
    },
    onSuccess: (template_id) => {
      queryClient.invalidateQueries({ queryKey: ["audit-sections", template_id] });
      toast.success("Section deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete section: " + error.message);
    },
  });
};
