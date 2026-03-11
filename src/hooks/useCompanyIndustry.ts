import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";

export const useCompanyIndustry = () => {
  const { company } = useCompanyContext();
  const industryId = company?.industry_id;

  return useQuery({
    queryKey: ["company_industry", industryId],
    queryFn: async () => {
      if (!industryId) return null;
      const { data, error } = await supabase
        .from("industries")
        .select("id, name, slug")
        .eq("id", industryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!industryId,
    staleTime: 10 * 60 * 1000,
  });
};
