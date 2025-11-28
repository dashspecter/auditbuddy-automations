import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  company_role: 'company_owner' | 'company_admin';
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export interface CompanyModule {
  id: string;
  company_id: string;
  module_name: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
}

// Get current user's company
export const useCompany = () => {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's company
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id, company_role')
        .eq('user_id', user.id)
        .single();

      if (cuError) throw cuError;

      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyUser.company_id)
        .single();

      if (companyError) throw companyError;

      return {
        ...company,
        userRole: companyUser.company_role,
      } as Company & { userRole: string };
    },
  });
};

// Get company users
export const useCompanyUsers = () => {
  return useQuery({
    queryKey: ['company_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (!data || data.length === 0) return [];

      const userIds = data.map(cu => cu.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Merge the data
      return data.map(cu => ({
        ...cu,
        profiles: profiles?.find(p => p.id === cu.user_id),
      })) as CompanyUser[];
    },
  });
};

// Get company modules
export const useCompanyModules = () => {
  return useQuery({
    queryKey: ['company_modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_modules')
        .select('*')
        .order('module_name');

      if (error) throw error;
      return data as CompanyModule[];
    },
  });
};

// Update company
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Company>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error('No company found');

      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyUser.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Toggle module activation
export const useToggleModule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ moduleId, isActive }: { moduleId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('company_modules')
        .update({
          is_active: isActive,
          deactivated_at: isActive ? null : new Date().toISOString(),
        })
        .eq('id', moduleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_modules'] });
      toast({
        title: "Success",
        description: "Module updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Invite user to company
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'company_owner' | 'company_admin' }) => {
      // This would typically send an invitation email
      // For now, we'll just show that the functionality exists
      throw new Error('User invitation system coming soon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};