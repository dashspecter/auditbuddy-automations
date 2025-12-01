import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useDepartments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_order')
        .order('name');

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!user,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (department: Omit<Department, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) throw new Error('No company found');

      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...department,
          company_id: companyData.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      toast.success('Department created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create department: ${error.message}`);
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Department> & { id: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      toast.success('Department updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update department: ${error.message}`);
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete department: ${error.message}`);
    },
  });
};
