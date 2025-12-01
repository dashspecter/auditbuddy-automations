import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Shift {
  id: string;
  company_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  required_count: number;
  notes: string | null;
  created_at: string;
  created_by: string;
  locations?: {
    name: string;
  };
}

export const useShifts = (locationId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["shifts", locationId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select(`
          *,
          locations(name),
          profiles!shifts_created_by_fkey(full_name)
        `)
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      if (startDate) {
        query = query.gte("shift_date", startDate);
      }
      if (endDate) {
        query = query.lte("shift_date", endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Shift[];
    },
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shift: Omit<Shift, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("shifts")
        .insert({ ...shift, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create shift: " + error.message);
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shift> & { id: string }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update shift: " + error.message);
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete shift: " + error.message);
    },
  });
};
