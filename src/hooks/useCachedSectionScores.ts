import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";

export interface CachedSectionScore {
  section_id: string;
  section_name: string;
  field_count: number;
  scored_fields: number;
  total_score: number;
}

export interface AuditWithCachedScores {
  id: string;
  audit_date: string;
  location_id: string | null;
  template_id: string | null;
  overall_score: number | null;
  status: string | null;
  cached_section_scores: Record<string, CachedSectionScore> | null;
}

/**
 * Reads pre-computed section scores directly from location_audits.cached_section_scores
 * instead of joining audit_field_responses + audit_fields + audit_sections.
 *
 * This is the Phase 3 "hot path" optimization — ~5-10ms vs ~200-500ms.
 */
export const useCachedSectionScores = (
  locationFilter?: string,
  dateFrom?: string,
  dateTo?: string,
  templateFilter?: string
) => {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["cached-section-scores", companyId, locationFilter, dateFrom, dateTo, templateFilter],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from("location_audits")
        .select("id, audit_date, location_id, template_id, overall_score, status, cached_section_scores")
        .eq("company_id", companyId)
        .not("cached_section_scores", "is", null);

      if (locationFilter && locationFilter !== "all") {
        query = query.eq("location_id", locationFilter);
      }
      if (dateFrom) {
        query = query.gte("audit_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("audit_date", dateTo);
      }
      if (templateFilter && templateFilter !== "all") {
        query = query.eq("template_id", templateFilter);
      }

      query = query.order("audit_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as unknown as AuditWithCachedScores[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};
