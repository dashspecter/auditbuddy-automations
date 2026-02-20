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
  industry_id: string | null;
  created_at: string;
  updated_at: string;
  enable_schedule_governance?: boolean;
  clock_in_enabled?: boolean;
  auto_clockout_delay_minutes?: number;
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get user's company - try company_users first
      let companyId: string | null = null;
      let userRole: string = 'employee';
      
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id, company_role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cuError) {
        console.error('[useCompany] Error fetching company_users:', cuError);
      }

      if (companyUser) {
        companyId = companyUser.company_id;
        userRole = companyUser.company_role;
      } else {
        // Fallback: check employees table for staff users without company_users record
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (empError) {
          console.error('[useCompany] Error fetching employee:', empError);
        }

        if (employee) {
          companyId = employee.company_id;
          userRole = 'employee';
        }
      }

      if (!companyId) {
        throw new Error('No company association found');
      }

      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) {
        console.error('[useCompany] Error fetching company:', companyError);
        throw companyError;
      }

      if (!company) {
        console.error('[useCompany] Company not found for id:', companyId);
        throw new Error('Company not found');
      }

      return {
        ...company,
        userRole,
      } as Company & { userRole: string };
    },
    retry: 1,
    retryDelay: 500,
    staleTime: 15 * 60 * 1000, // 15 minutes - company config rarely changes
    gcTime: 15 * 60 * 1000,
  });
};


// Get company users
export const useCompanyUsers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company_users', user?.id],
    queryFn: async () => {
      if (!user) {
        
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
        
        return [];
      }

      

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
      
      
      return result;
    },
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes
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

      // First try company_users table
      let companyId: string | null = null;
      
      const { data: companyUser, error: cuError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cuError) {
        console.error('[useCompanyModules] Error fetching company user:', cuError);
      }

      if (companyUser) {
        companyId = companyUser.company_id;
      } else {
        // Fallback: check employees table for staff users without company_users record
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (empError) {
          console.error('[useCompanyModules] Error fetching employee:', empError);
        }

        companyId = employee?.company_id || null;
      }

      if (!companyId) {
        console.log('[useCompanyModules] No company found for user');
        return [];
      }

      console.log('[useCompanyModules] Fetching modules for company:', companyId);

      // Then get the company's modules
      const { data, error } = await supabase
        .from('company_modules')
        .select('*')
        .eq('company_id', companyId)
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
    staleTime: 15 * 60 * 1000, // 15 minutes
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

const DEFAULT_WA_TEMPLATES = [
  { name: "task_assigned", body: "📋 New task: {{1}}. Please complete it before the deadline.", category: "utility", language: "en" },
  { name: "shift_assigned", body: "📅 You've been assigned a shift on {{1}} from {{2}} to {{3}}.", category: "utility", language: "en" },
  { name: "shift_published", body: "📢 Your schedule for {{1}} has been published. Shift: {{2}} - {{3}}.", category: "utility", language: "en" },
  { name: "ca_assigned", body: "⚠️ Corrective Action: {{1}}. Your task: {{2}} (Severity: {{3}}). Please resolve promptly.", category: "utility", language: "en" },
  { name: "announcement", body: "📣 {{1}}", category: "marketing", language: "en" },
];

async function seedWhatsAppTemplates(companyId: string) {
  // Check if templates already exist for this company
  const { count } = await supabase
    .from("wa_message_templates")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if ((count ?? 0) > 0) return; // Already seeded

  const templates = DEFAULT_WA_TEMPLATES.map((t) => ({
    company_id: companyId,
    name: t.name,
    body: t.body,
    category: t.category,
    language: t.language,
    approval_status: "approved", // Pre-approved defaults
    version: 1,
  }));

  await supabase.from("wa_message_templates").insert(templates);
}

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company_modules'] });
      toast({
        title: "Success",
        description: "Module updated successfully",
      });

      // Seed default WhatsApp templates when module is activated
      if (data?.module_name === 'whatsapp_messaging' && data?.is_active) {
        seedWhatsAppTemplates(data.company_id).catch((err) =>
          console.warn("[WhatsApp] Template seeding error:", err)
        );
      }
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
    mutationFn: async ({ companyUserId, role }: { companyUserId: string; role: 'company_owner' | 'company_admin' | 'company_member' }) => {
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
    mutationFn: async ({ userId, role, action }: { userId: string; role: 'admin' | 'manager' | 'checker' | 'hr'; action: 'add' | 'remove' }) => {
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
      // Ensure role-dependent UI updates immediately across the app
      queryClient.invalidateQueries({ queryKey: ['user_role'] });
      queryClient.invalidateQueries({ queryKey: ['company_role_permissions'] });
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