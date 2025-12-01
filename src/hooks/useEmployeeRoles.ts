import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EmployeeRole {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string;
  department: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const useEmployeeRoles = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee_roles'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('employee_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as EmployeeRole[];
    },
    enabled: !!user,
  });
};

export const useCreateEmployeeRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (role: Omit<EmployeeRole, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: companyData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyData) throw new Error('No company found');

      const { data, error } = await supabase
        .from('employee_roles')
        .insert({
          ...role,
          company_id: companyData.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
};

export const useUpdateEmployeeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeRole> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_roles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
};

export const useDeleteEmployeeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });
};
