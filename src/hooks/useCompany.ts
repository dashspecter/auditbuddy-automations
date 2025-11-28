import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  platform_roles?: string[];
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

      console.log('[useCompany] Fetching company for user:', user.id);

      // Get user's company
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id, company_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cuError) {
        console.error('[useCompany] Error fetching company_users:', cuError);
        throw cuError;
      }

      if (!companyUser) {
        console.log('[useCompany] No company_users record found for user:', user.id);
        throw new Error('No company association found');
      }

      console.log('[useCompany] Found company_users record:', companyUser);

      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyUser.company_id)
        .maybeSingle();

      if (companyError) {
        console.error('[useCompany] Error fetching company:', companyError);
        throw companyError;
      }

      if (!company) {
        console.error('[useCompany] Company not found for id:', companyUser.company_id);
        throw new Error('Company not found');
      }

      console.log('[useCompany] Successfully fetched company:', company.name);

      return {
        ...company,
        userRole: companyUser.company_role,
      } as Company & { userRole: string };
    },
    retry: 1,
    retryDelay: 500,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Get company users
export const useCompanyUsers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company_users', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('[useCompanyUsers] No user');
        return [];
      }

      // First get the user's company
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cuError) {
        console.error('[useCompanyUsers] Error fetching company:', cuError);
        throw cuError;
      }

      if (!companyUser) {
        console.log('[useCompanyUsers] No company found');
        return [];
      }

      console.log('[useCompanyUsers] Fetching users for company:', companyUser.company_id);

      // Get all users from the same company
      const { data, error } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (!data || data.length === 0) return [];

      const userIds = data.map(cu => cu.user_id);
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Fetch platform roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Group roles by user_id
      const rolesByUser = userRoles?.reduce((acc, ur) => {
        if (!acc[ur.user_id]) acc[ur.user_id] = [];
        acc[ur.user_id].push(ur.role);
        return acc;
      }, {} as Record<string, string[]>) || {};

      // Merge the data
      const result = data.map(cu => ({
        ...cu,
        profiles: profiles?.find(p => p.id === cu.user_id),
        platform_roles: rolesByUser[cu.user_id] || [],
      })) as CompanyUser[];
      
      console.log('[useCompanyUsers] Loaded users:', result.length);
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

// Get company modules
export const useCompanyModules = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company_modules', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('[useCompanyModules] No user');
        return [];
      }

      console.log('[useCompanyModules] Fetching modules for user:', user.id);

      // First get the user's company
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cuError) {
        console.error('[useCompanyModules] Error fetching company user:', cuError);
        throw cuError;
      }

      if (!companyUser) {
        console.log('[useCompanyModules] No company user found');
        return [];
      }

      console.log('[useCompanyModules] Fetching modules for company:', companyUser.company_id);

      // Then get the company's modules
      const { data, error } = await supabase
        .from('company_modules')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .eq('is_active', true)
        .order('module_name');

      if (error) {
        console.error('[useCompanyModules] Error fetching modules:', error);
        throw error;
      }

      console.log('[useCompanyModules] Loaded modules:', data?.map(m => m.module_name));
      return data as CompanyModule[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

// Update company role
export const useUpdateCompanyRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ companyUserId, role }: { companyUserId: string; role: 'company_owner' | 'company_admin' }) => {
      const { data, error } = await supabase
        .from('company_users')
        .update({ company_role: role })
        .eq('id', companyUserId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
      toast({
        title: "Success",
        description: "Company role updated successfully",
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

// Add or remove platform role
export const useUpdatePlatformRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: 'admin' | 'manager' | 'checker'; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        // Check if role already exists
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', role)
          .maybeSingle();

        if (existing) {
          // Role already exists, just return success
          return existing;
        }

        // Insert new role
        const { data, error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (error) throw error;
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
      toast({
        title: "Success",
        description: "Platform role updated successfully",
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