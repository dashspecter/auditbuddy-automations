import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaffAudit {
  id: string;
  location_id: string;
  employee_id: string;
  template_id: string | null;
  auditor_id: string;
  audit_date: string;
  score: number;
  notes: string | null;
  custom_data: any;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    role: string;
  };
  locations?: {
    name: string;
  };
}

export const useStaffAudits = (employeeId?: string, locationId?: string) => {
  return useQuery({
    queryKey: ["staff-audits", employeeId, locationId],
    queryFn: async () => {
      let query = supabase
        .from("staff_audits")
        .select("*, employees(full_name, role), locations(name)")
        .order("audit_date", { ascending: false });
      
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StaffAudit[];
    },
  });
};

export const useCreateStaffAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (audit: Omit<StaffAudit, "id" | "created_at" | "updated_at" | "auditor_id">) => {
      // Force token refresh to ensure JWT is valid
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !session) {
        throw new Error("SESSION_EXPIRED");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SESSION_EXPIRED");

      // Resolve company_id so the inserted row passes SELECT RLS
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!empData?.company_id) throw new Error("Employee record not found for current user");
      
      const { data, error } = await supabase
        .from("staff_audits")
        .insert({ ...audit, auditor_id: user.id, company_id: empData.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-audits"] });
      toast.success("Staff audit submitted successfully");
    },
    onError: (error) => {
      if (error.message === "SESSION_EXPIRED" || error.message?.includes("row-level security")) {
        toast.error("Your session has expired. Please log in again.");
      } else {
        toast.error("Failed to submit audit: " + error.message);
      }
    },
  });
};

export const useEmployeeScore = (employeeId: string, lastN: number = 5) => {
  return useQuery({
    queryKey: ["employee-score", employeeId, lastN],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_audits")
        .select("score, audit_date")
        .eq("employee_id", employeeId)
        .order("audit_date", { ascending: false })
        .limit(lastN);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { average: 0, scores: [], trend: "neutral" as const };
      }
      
      const scores = data.map(a => a.score);
      const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      // Calculate trend
      let trend: "up" | "down" | "neutral" = "neutral";
      if (scores.length >= 2) {
        const recentAvg = (scores[0] + scores[1]) / 2;
        const olderAvg = scores.slice(-2).reduce((a, b) => a + b, 0) / Math.min(2, scores.length - 1);
        if (recentAvg > olderAvg + 5) trend = "up";
        else if (recentAvg < olderAvg - 5) trend = "down";
      }
      
      return { average, scores: data, trend };
    },
  });
};
