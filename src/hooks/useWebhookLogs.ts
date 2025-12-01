import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export const useWebhookLogs = (integrationId?: string) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["webhook_logs", company?.id, integrationId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from("webhook_logs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (integrationId) {
        query = query.eq("integration_id", integrationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
};

export const useLogWebhook = () => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      integrationId?: string;
      webhookType: string;
      payload: any;
      headers?: any;
      statusCode?: number;
    }) => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase.from("webhook_logs").insert({
        company_id: company.id,
        integration_id: params.integrationId,
        webhook_type: params.webhookType,
        payload: params.payload,
        headers: params.headers,
        status_code: params.statusCode || 200,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_logs"] });
      toast.success("Webhook logged");
    },
    onError: (error) => {
      toast.error("Failed to log webhook");
      console.error("Error logging webhook:", error);
    },
  });
};
