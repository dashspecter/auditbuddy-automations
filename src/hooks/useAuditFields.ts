import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AuditField {
  id: string;
  section_id: string;
  name: string;
  field_type: string;
  is_required: boolean;
  display_order: number;
  options: any;
  created_at: string;
  updated_at: string;
}

export const useAuditFields = (sectionId?: string) => {
  return useQuery({
    queryKey: ["audit-fields", sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
      const { data, error } = await supabase
        .from("audit_fields")
        .select("*")
        .eq("section_id", sectionId)
        .order("display_order");
      
      if (error) throw error;
      return data as AuditField[];
    },
    enabled: !!sectionId,
  });
};

export const useCreateAuditField = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (field: Omit<AuditField, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("audit_fields")
        .insert(field)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["audit-fields", variables.section_id] });
      toast.success("Field created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create field: " + error.message);
    },
  });
};

export const useUpdateAuditField = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, section_id, ...updates }: Partial<AuditField> & { id: string; section_id: string }) => {
      const { data, error } = await supabase
        .from("audit_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, section_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["audit-fields", result.section_id] });
      toast.success("Field updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update field: " + error.message);
    },
  });
};

export const useDeleteAuditField = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, section_id }: { id: string; section_id: string }) => {
      const { error } = await supabase
        .from("audit_fields")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return section_id;
    },
    onSuccess: (section_id) => {
      queryClient.invalidateQueries({ queryKey: ["audit-fields", section_id] });
      toast.success("Field deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete field: " + error.message);
    },
  });
};
