import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyOverview {
  employees_count: number;
  locations_count: number;
  departments_count: number;
  tasks_total: number;
  tasks_completed: number;
  audit_templates_count: number;
  audits_count: number;
  corrective_actions_count: number;
  shifts_count: number;
  last_audit_at: string | null;
  last_task_at: string | null;
  last_shift_at: string | null;
  owner_email: string | null;
  company_users_count: number;
}

export function useCompanyOverview(companyId: string | undefined) {
  return useQuery({
    queryKey: ['admin-company-overview', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_overview', {
        target_company_id: companyId!,
      });
      if (error) throw error;
      return data as unknown as CompanyOverview;
    },
    enabled: !!companyId,
  });
}
