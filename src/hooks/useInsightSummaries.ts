import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export const useInsightSummaries = (periodStart?: string, periodEnd?: string) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["insight_summaries", company?.id, periodStart, periodEnd],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from("insight_summaries")
        .select("*")
        .eq("company_id", company.id)
        .order("generated_at", { ascending: false });

      if (periodStart) {
        query = query.gte("period_start", periodStart);
      }
      if (periodEnd) {
        query = query.lte("period_end", periodEnd);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
};

export const useSaveInsightSummary = () => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: {
      summaryType: string;
      periodStart: string;
      periodEnd: string;
      content: any;
      contentHtml?: string;
    }) => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase.from("insight_summaries").insert({
        company_id: company.id,
        summary_type: params.summaryType,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        content: params.content,
        content_html: params.contentHtml,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insight_summaries"] });
      toast.success("Insight summary saved");
    },
    onError: (error) => {
      toast.error("Failed to save insight summary");
      console.error("Error saving insight:", error);
    },
  });
};
