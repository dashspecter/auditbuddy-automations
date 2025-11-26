import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Employee {
  id: string;
  location_id: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  locations?: {
    name: string;
  };
}

export const useEmployees = (locationId?: string) => {
  return useQuery({
    queryKey: ["employees", locationId],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, locations(name)")
        .order("full_name");
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Employee[];
    },
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Omit<Employee, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...employee, created_by: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add employee: " + error.message);
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update employee: " + error.message);
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete employee: " + error.message);
    },
  });
};
