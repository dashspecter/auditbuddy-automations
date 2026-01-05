import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditFieldLite = {
  id: string;
  field_type: string;
};

type AuditSectionRow = {
  template_id: string;
  audit_fields: Array<{ id: string; field_type: string }> | null;
};

/**
 * Loads audit field metadata (id + field_type) for a set of audit template IDs.
 * Used to accurately compute derived scores from custom_data.
 */
export function useAuditTemplateFields(templateIds: string[]) {
  const ids = Array.from(new Set(templateIds.filter(Boolean))).sort();

  return useQuery({
    queryKey: ["audit_template_fields", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_sections")
        .select("template_id, audit_fields(id, field_type)")
        .in("template_id", ids)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const rows = (data || []) as AuditSectionRow[];
      const map: Record<string, AuditFieldLite[]> = {};

      for (const row of rows) {
        if (!map[row.template_id]) map[row.template_id] = [];
        for (const f of row.audit_fields || []) {
          map[row.template_id].push({ id: f.id, field_type: f.field_type });
        }
      }

      // Deduplicate by field id (safety)
      for (const tid of Object.keys(map)) {
        const seen = new Set<string>();
        map[tid] = map[tid].filter((f) => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
      }

      return map;
    },
    staleTime: 10 * 60 * 1000,
  });
}
