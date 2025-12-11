import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { toast } from '@/hooks/use-toast';

export type CompanyPermission = 
  | 'manage_users'
  | 'manage_settings'
  | 'manage_billing'
  | 'manage_modules'
  | 'view_reports'
  | 'manage_locations'
  | 'manage_employees'
  | 'manage_shifts'
  | 'manage_audits';

export const PERMISSION_LABELS: Record<CompanyPermission, { label: string; description: string }> = {
  manage_users: { label: 'Manage Users', description: 'Invite, edit, and remove company users' },
  manage_settings: { label: 'Manage Settings', description: 'Edit company name and general settings' },
  manage_billing: { label: 'Manage Billing', description: 'View and manage subscription and billing' },
  manage_modules: { label: 'Manage Modules', description: 'Enable or disable company modules' },
  view_reports: { label: 'View Reports', description: 'Access analytics and reports' },
  manage_locations: { label: 'Manage Locations', description: 'Create, edit, and delete locations' },
  manage_employees: { label: 'Manage Employees', description: 'Add, edit, and remove employees' },
  manage_shifts: { label: 'Manage Shifts', description: 'Create and manage work shifts' },
  manage_audits: { label: 'Manage Audits', description: 'Create and manage audit templates' },
};

export const ALL_PERMISSIONS: CompanyPermission[] = [
  'manage_users',
  'manage_settings',
  'manage_billing',
  'manage_modules',
  'view_reports',
  'manage_locations',
  'manage_employees',
  'manage_shifts',
  'manage_audits',
];

interface RolePermission {
  id: string;
  company_id: string;
  company_role: string;
  permission: CompanyPermission;
  granted_by: string;
  granted_at: string;
}

export const useCompanyPermissions = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['company_role_permissions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('company_role_permissions')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!company?.id,
  });
};

export const useRolePermissions = (companyRole: 'company_admin' | 'company_member') => {
  const { data: permissions = [] } = useCompanyPermissions();
  
  return permissions
    .filter(p => p.company_role === companyRole)
    .map(p => p.permission);
};

export const useTogglePermission = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyRole, 
      permission, 
      granted 
    }: { 
      companyRole: 'company_admin' | 'company_member'; 
      permission: CompanyPermission; 
      granted: boolean;
    }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      if (granted) {
        const { error } = await supabase
          .from('company_role_permissions')
          .insert({
            company_id: company.id,
            company_role: companyRole,
            permission,
            granted_by: user.id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_role_permissions')
          .delete()
          .eq('company_id', company.id)
          .eq('company_role', companyRole)
          .eq('permission', permission);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_role_permissions'] });
      toast({ title: 'Permission updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update permission', description: error.message, variant: 'destructive' });
    },
  });
};

export const useHasPermission = (permission: CompanyPermission) => {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const { data: permissions = [] } = useCompanyPermissions();

  if (!user || !company) return false;
  
  // Owners have all permissions
  if (company.userRole === 'company_owner') return true;
  
  // Check if user's role has the permission
  return permissions.some(
    p => p.company_role === company.userRole && p.permission === permission
  );
};
