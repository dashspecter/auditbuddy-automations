import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export const useIntegrations = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["integrations", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      integrationType: string;
      description?: string;
    }) => {
      if (!company?.id) throw new Error("No company found");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("integrations").insert({
        company_id: company.id,
        name: params.name,
        integration_type: params.integrationType,
        description: params.description,
        created_by: user.id,
        status: "inactive",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration created");
    },
    onError: (error) => {
      toast.error("Failed to create integration");
      console.error("Error creating integration:", error);
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: string;
      description?: string;
    }) => {
      const { error } = await supabase
        .from("integrations")
        .update({
          status: params.status,
          description: params.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration updated");
    },
    onError: (error) => {
      toast.error("Failed to update integration");
      console.error("Error updating integration:", error);
    },
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete integration");
      console.error("Error deleting integration:", error);
    },
  });
};
