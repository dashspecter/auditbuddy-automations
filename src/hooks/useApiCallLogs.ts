import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export const useApiCallLogs = (integrationId?: string) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["api_call_logs", company?.id, integrationId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from("api_call_logs")
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

export const useLogApiCall = () => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      integrationId?: string;
      endpoint: string;
      method: string;
      requestPayload?: any;
      responsePayload?: any;
      statusCode?: number;
      durationMs?: number;
      success?: boolean;
      errorMessage?: string;
    }) => {
      if (!company?.id) throw new Error("No company found");
      
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("api_call_logs").insert({
        company_id: company.id,
        integration_id: params.integrationId,
        endpoint: params.endpoint,
        method: params.method,
        request_payload: params.requestPayload,
        response_payload: params.responsePayload,
        status_code: params.statusCode || 200,
        duration_ms: params.durationMs,
        success: params.success !== false,
        error_message: params.errorMessage,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_call_logs"] });
      toast.success("API call logged");
    },
    onError: (error) => {
      toast.error("Failed to log API call");
      console.error("Error logging API call:", error);
    },
  });
};
