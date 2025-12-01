import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PayrollPeriod {
  id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  created_by: string;
}

export interface PayrollItem {
  id: string;
  period_id: string;
  staff_id: string;
  type: string;
  amount: number;
  hours: number;
  rate: number;
  description: string;
  metadata: any;
  created_at: string;
  employees?: {
    full_name: string;
    role: string;
    hourly_rate: number;
    base_salary: number;
  };
}

export const usePayrollPeriods = () => {
  return useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });
};

export const usePayrollItems = (periodId?: string) => {
  return useQuery({
    queryKey: ["payroll-items", periodId],
    queryFn: async () => {
      let query = supabase
        .from("payroll_items")
        .select("*, employees(full_name, role, hourly_rate, base_salary)")
        .order("created_at", { ascending: false });
      
      if (periodId) {
        query = query.eq("period_id", periodId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollItem[];
    },
    enabled: !!periodId,
  });
};

export const useCreatePayrollPeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (period: Omit<PayrollPeriod, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ ...period, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      toast.success("Payroll period created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create payroll period: " + error.message);
    },
  });
};
