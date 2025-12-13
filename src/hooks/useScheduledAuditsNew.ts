import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledAudit {
  id: string;
  company_id: string;
  template_id: string;
  location_id: string;
  assigned_to: string;
  scheduled_for: string;
  frequency: string | null;
  status: string;
  created_at: string;
  created_by: string;
  audit_templates?: {
    name: string;
  };
  locations?: {
    name: string;
  };
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useScheduledAuditsNew = (locationId?: string) => {
  return useQuery({
    queryKey: ["scheduled-audits-new", locationId],
    queryFn: async () => {
      let query = supabase
        .from("scheduled_audits")
        .select(`
          *,
          audit_templates(name),
          locations(name)
        `)
        .order("scheduled_for", { ascending: true });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch assignee profiles separately
      const assignedUserIds = [...new Set((data || []).map(a => a.assigned_to).filter(Boolean))];
      
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", assignedUserIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string | null }>);
        }
      }
      
      // Attach profile data to each audit
      const auditsWithProfiles = (data || []).map(audit => ({
        ...audit,
        profiles: profilesMap[audit.assigned_to] || null
      }));
      
      return auditsWithProfiles as ScheduledAudit[];
    },
  });
};

export const useCreateScheduledAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (audit: Omit<ScheduledAudit, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("scheduled_audits")
        .insert({ ...audit, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-audits-new"] });
      toast.success("Audit scheduled successfully");
    },
    onError: (error) => {
      toast.error("Failed to schedule audit: " + error.message);
    },
  });
};

export const useUpdateScheduledAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledAudit> & { id: string }) => {
      const { data, error } = await supabase
        .from("scheduled_audits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-audits-new"] });
      toast.success("Scheduled audit updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update scheduled audit: " + error.message);
    },
  });
};
