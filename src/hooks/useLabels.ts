import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCallback } from "react";

interface LabelOverride {
  label_key: string;
  custom_value: string;
}

export const useLabels = () => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  const { data: overrides = [] } = useQuery({
    queryKey: ["company_label_overrides", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_label_overrides" as any)
        .select("label_key, custom_value")
        .eq("company_id", companyId);

      if (error) throw error;
      return (data || []) as unknown as LabelOverride[];
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes — labels rarely change
  });

  const label = useCallback(
    (key: string, fallback: string): string => {
      const override = overrides.find((o) => o.label_key === key);
      return override?.custom_value || fallback;
    },
    [overrides]
  );

  return { label, overrides };
};
