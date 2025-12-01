import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useIntegrationSettings = (integrationId?: string) => {
  return useQuery({
    queryKey: ["integration_settings", integrationId],
    queryFn: async () => {
      if (!integrationId) return [];
      
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("integration_id", integrationId)
        .order("key", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!integrationId,
  });
};

export const useSaveIntegrationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      integrationId: string;
      key: string;
      value: string;
      isSecret?: boolean;
    }) => {
      const { error } = await supabase.from("integration_settings").upsert({
        integration_id: params.integrationId,
        key: params.key,
        value: params.value,
        is_secret: params.isSecret || false,
      }, {
        onConflict: "integration_id,key"
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["integration_settings", variables.integrationId] });
      toast.success("Setting saved");
    },
    onError: (error) => {
      toast.error("Failed to save setting");
      console.error("Error saving setting:", error);
    },
  });
};

export const useDeleteIntegrationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; integrationId: string }) => {
      const { error } = await supabase
        .from("integration_settings")
        .delete()
        .eq("id", params.id);

      if (error) throw error;
      return params.integrationId;
    },
    onSuccess: (integrationId) => {
      queryClient.invalidateQueries({ queryKey: ["integration_settings", integrationId] });
      toast.success("Setting deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete setting");
      console.error("Error deleting setting:", error);
    },
  });
};
