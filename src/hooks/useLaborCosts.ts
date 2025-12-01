import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LaborCost {
  id: string;
  company_id: string;
  location_id: string;
  date: string;
  scheduled_hours: number;
  scheduled_cost: number;
  actual_hours: number;
  actual_cost: number;
  projected_sales: number;
  actual_sales: number;
  created_at: string;
  updated_at: string;
}

export const useLaborCosts = (locationId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["labor-costs", locationId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("labor_costs")
        .select("*")
        .order("date", { ascending: true });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as LaborCost[];
    },
  });
};

export const useUpsertLaborCost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (laborCost: Omit<LaborCost, "id" | "created_at" | "updated_at" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("labor_costs")
        .upsert(
          { ...laborCost, company_id: companyUser.company_id },
          { onConflict: "location_id,date" }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labor-costs"] });
    },
    onError: (error) => {
      toast.error("Failed to update labor costs: " + error.message);
    },
  });
};