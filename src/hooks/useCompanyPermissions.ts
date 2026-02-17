import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { toast } from '@/hooks/use-toast';
import { useUserTemplatePermissions, TemplatePermissionEntry } from '@/hooks/useUserTemplatePermissions';

export type CompanyPermission = 
  | 'manage_users'
  | 'manage_settings'
  | 'manage_billing'
  | 'manage_modules'
  | 'view_reports'
  | 'manage_locations'
  | 'manage_employees'
  | 'manage_shifts'
  | 'manage_audits'
  | 'manage_notifications';

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
  manage_notifications: { label: 'Manage Notifications', description: 'Send and manage notifications' },
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
  'manage_notifications',
];

/**
 * Maps CompanyPermission to the corresponding Role Template resource.
 * Used to bridge legacy permission checks with the new template system.
 */
const PERMISSION_TO_RESOURCE: Record<CompanyPermission, string> = {
  manage_users: 'users',
  manage_settings: 'company_settings',
  manage_billing: 'billing',
  manage_modules: 'company_settings',
  view_reports: 'reports',
  manage_locations: 'locations',
  manage_employees: 'employees',
  manage_shifts: 'shifts',
  manage_audits: 'audits',
  manage_notifications: 'notifications',
};

/**
 * Check if template permissions grant access for a given CompanyPermission.
 * Returns true if the template grants ANY action on the mapped resource.
 */
const hasTemplatePermissionForLegacy = (
  templatePermissions: TemplatePermissionEntry[] | null | undefined,
  permission: CompanyPermission
): boolean => {
  if (!templatePermissions) return false;
  const resource = PERMISSION_TO_RESOURCE[permission];
  if (!resource) return false;
  return templatePermissions.some(p => p.resource === resource && p.granted);
};

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

// Hook to check if the current user has a specific permission
export const useHasPermission = (permission: CompanyPermission): boolean => {
  const { user } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: permissions = [], isLoading: permissionsLoading } = useCompanyPermissions();
  const { data: templatePermissions, isLoading: templateLoading } = useUserTemplatePermissions();

  // While loading, assume access to prevent flicker
  if (!user || companyLoading || permissionsLoading || templateLoading) return true;
  if (!company) return false;
  
  // Owners and admins have all permissions
  if (company.userRole === 'company_owner' || company.userRole === 'company_admin') return true;
  
  // Template-first: if user has a template assigned, use it
  const hasTemplate = templatePermissions !== null && templatePermissions !== undefined;
  if (hasTemplate) {
    return hasTemplatePermissionForLegacy(templatePermissions, permission);
  }
  
  // Legacy fallback: check company_role_permissions table
  return permissions.some(
    p => p.company_role === company.userRole && p.permission === permission
  );
};

// Hook to check multiple permissions at once
export const usePermissions = () => {
  const { user } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: permissions = [], isLoading: permissionsLoading } = useCompanyPermissions();
  const { data: templatePermissions, isLoading: templateLoading } = useUserTemplatePermissions();

  const isLoading = companyLoading || permissionsLoading || templateLoading;
  const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';
  const hasTemplate = templatePermissions !== null && templatePermissions !== undefined;

  const hasPermission = (permission: CompanyPermission): boolean => {
    // While loading, assume access to prevent flicker
    if (!user || isLoading) return true;
    if (!company) return false;
    
    // Owners and admins have all permissions
    if (isOwnerOrAdmin) return true;
    
    // Template-first: if user has a template assigned, check template permissions
    if (hasTemplate) {
      return hasTemplatePermissionForLegacy(templatePermissions, permission);
    }
    
    // Legacy fallback: check company_role_permissions table
    return permissions.some(
      p => p.company_role === company.userRole && p.permission === permission
    );
  };

  return {
    hasPermission,
    isLoading,
    isOwnerOrAdmin,
    userRole: company?.userRole,
  };
};
