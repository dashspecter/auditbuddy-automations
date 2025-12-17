import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { usePermissions, CompanyPermission } from '@/hooks/useCompanyPermissions';
import { useAuth } from '@/contexts/AuthContext';

export type ActionType = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'approve';

export type ResourceType =
  | 'employees'
  | 'shifts'
  | 'attendance'
  | 'audits'
  | 'locations'
  | 'equipment'
  | 'documents'
  | 'notifications'
  | 'reports'
  | 'tests'
  | 'integrations'
  | 'company_settings'
  | 'billing'
  | 'users';

interface CanResult {
  allowed: boolean;
  reason?: string;
}

interface UseCanReturn {
  can: (action: ActionType, resource: ResourceType, context?: Record<string, any>) => CanResult;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  isCompanyOwner: boolean;
  isCompanyAdmin: boolean;
}

/**
 * Permission matrix defining which roles/permissions are required for each action+resource
 */
const permissionMatrix: Record<ResourceType, Record<ActionType, {
  roles?: string[];
  permission?: CompanyPermission;
  module?: string;
  ownerOnly?: boolean;
  adminOnly?: boolean;
}>> = {
  employees: {
    view: { roles: ['admin', 'manager', 'hr'], permission: 'manage_employees' },
    create: { roles: ['admin', 'hr'], permission: 'manage_employees' },
    update: { roles: ['admin', 'hr'], permission: 'manage_employees' },
    delete: { roles: ['admin'], permission: 'manage_employees' },
    manage: { roles: ['admin', 'hr'], permission: 'manage_employees' },
    approve: { roles: ['admin', 'manager', 'hr'], permission: 'manage_employees' },
  },
  shifts: {
    view: { roles: ['admin', 'manager', 'hr'], permission: 'manage_shifts', module: 'workforce' },
    create: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    update: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    delete: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    approve: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
  },
  attendance: {
    view: { roles: ['admin', 'manager', 'hr'], permission: 'manage_shifts', module: 'workforce' },
    create: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    update: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    delete: { roles: ['admin'], permission: 'manage_shifts', module: 'workforce' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
    approve: { roles: ['admin', 'manager'], permission: 'manage_shifts', module: 'workforce' },
  },
  audits: {
    view: { roles: ['admin', 'manager', 'hr', 'checker'], permission: 'manage_audits', module: 'location_audits' },
    create: { roles: ['admin', 'manager', 'hr', 'checker'], permission: 'manage_audits', module: 'location_audits' },
    update: { roles: ['admin', 'manager', 'hr'], permission: 'manage_audits', module: 'location_audits' },
    delete: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'location_audits' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'location_audits' },
    approve: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'location_audits' },
  },
  locations: {
    view: { roles: ['admin', 'manager'], permission: 'manage_locations' },
    create: { roles: ['admin'], permission: 'manage_locations' },
    update: { roles: ['admin', 'manager'], permission: 'manage_locations' },
    delete: { roles: ['admin'], permission: 'manage_locations' },
    manage: { roles: ['admin'], permission: 'manage_locations' },
    approve: { roles: ['admin'], permission: 'manage_locations' },
  },
  equipment: {
    view: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'equipment_management' },
    create: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'equipment_management' },
    update: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'equipment_management' },
    delete: { roles: ['admin'], permission: 'manage_audits', module: 'equipment_management' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'equipment_management' },
    approve: { roles: ['admin', 'manager'], permission: 'manage_audits', module: 'equipment_management' },
  },
  documents: {
    view: { roles: ['admin', 'manager'], permission: 'view_reports', module: 'documents' },
    create: { roles: ['admin', 'manager'], permission: 'view_reports', module: 'documents' },
    update: { roles: ['admin', 'manager'], permission: 'view_reports', module: 'documents' },
    delete: { roles: ['admin'], permission: 'view_reports', module: 'documents' },
    manage: { roles: ['admin', 'manager'], permission: 'view_reports', module: 'documents' },
    approve: { roles: ['admin'], permission: 'view_reports', module: 'documents' },
  },
  notifications: {
    view: { roles: ['admin', 'manager'], permission: 'manage_notifications', module: 'notifications' },
    create: { roles: ['admin', 'manager'], permission: 'manage_notifications', module: 'notifications' },
    update: { roles: ['admin', 'manager'], permission: 'manage_notifications', module: 'notifications' },
    delete: { roles: ['admin'], permission: 'manage_notifications', module: 'notifications' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_notifications', module: 'notifications' },
    approve: { roles: ['admin'], permission: 'manage_notifications', module: 'notifications' },
  },
  reports: {
    view: { roles: ['admin', 'manager', 'hr'], permission: 'view_reports', module: 'reports' },
    create: { roles: ['admin'], permission: 'view_reports', module: 'reports' },
    update: { roles: ['admin'], permission: 'view_reports', module: 'reports' },
    delete: { roles: ['admin'], permission: 'view_reports', module: 'reports' },
    manage: { roles: ['admin'], permission: 'view_reports', module: 'reports' },
    approve: { roles: ['admin'], permission: 'view_reports', module: 'reports' },
  },
  tests: {
    view: { roles: ['admin', 'manager'], permission: 'manage_employees' },
    create: { roles: ['admin', 'manager'], permission: 'manage_employees' },
    update: { roles: ['admin', 'manager'], permission: 'manage_employees' },
    delete: { roles: ['admin'], permission: 'manage_employees' },
    manage: { roles: ['admin', 'manager'], permission: 'manage_employees' },
    approve: { roles: ['admin', 'manager'], permission: 'manage_employees' },
  },
  integrations: {
    view: { roles: ['admin'], module: 'integrations' },
    create: { roles: ['admin'], module: 'integrations' },
    update: { roles: ['admin'], module: 'integrations' },
    delete: { roles: ['admin'], module: 'integrations' },
    manage: { roles: ['admin'], module: 'integrations' },
    approve: { roles: ['admin'], module: 'integrations' },
  },
  company_settings: {
    view: { ownerOnly: true },
    create: { ownerOnly: true },
    update: { ownerOnly: true },
    delete: { ownerOnly: true },
    manage: { ownerOnly: true },
    approve: { ownerOnly: true },
  },
  billing: {
    view: { ownerOnly: true },
    create: { ownerOnly: true },
    update: { ownerOnly: true },
    delete: { ownerOnly: true },
    manage: { ownerOnly: true },
    approve: { ownerOnly: true },
  },
  users: {
    view: { adminOnly: true },
    create: { adminOnly: true },
    update: { adminOnly: true },
    delete: { ownerOnly: true },
    manage: { adminOnly: true },
    approve: { adminOnly: true },
  },
};

/**
 * useCan - Centralized authorization hook
 * 
 * Provides a unified way to check if the current user can perform
 * a specific action on a specific resource.
 * 
 * Usage:
 * ```tsx
 * const { can, isLoading } = useCan();
 * 
 * if (can('create', 'employees').allowed) {
 *   // Show create button
 * }
 * 
 * const result = can('delete', 'audits', { auditId: '123' });
 * if (!result.allowed) {
 *   console.log(result.reason); // "Insufficient permissions"
 * }
 * ```
 */
export function useCan(): UseCanReturn {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { modules, isLoading: companyLoading } = useCompanyContext();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Derive role flags from userRole data
  const isPlatformAdmin = userRole?.isAdmin ?? false;
  const isCompanyOwner = userRole?.companyRole === 'company_owner';
  const isCompanyAdmin = userRole?.isCompanyAdmin ?? false;

  const isLoading = roleLoading || permissionsLoading || companyLoading;

  const hasModule = (moduleName: string | undefined): boolean => {
    if (!moduleName) return true;
    if (!modules) return false;
    return modules.some((m: any) => m.module_name === moduleName && m.is_active);
  };

  const hasRole = (allowedRoles: string[] | undefined): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!userRole) return false;
    
    // Check against platform roles
    const platformRoles = userRole.roles || [];
    for (const role of allowedRoles) {
      if (platformRoles.includes(role as any)) return true;
    }
    
    // Also check derived role flags
    if (allowedRoles.includes('admin') && userRole.isAdmin) return true;
    if (allowedRoles.includes('manager') && userRole.isManager) return true;
    if (allowedRoles.includes('checker') && userRole.isChecker) return true;
    if (allowedRoles.includes('hr') && userRole.isHR) return true;
    
    return false;
  };

  const can = useMemo(() => {
    return (action: ActionType, resource: ResourceType, context?: Record<string, any>): CanResult => {
      // Not authenticated
      if (!user) {
        return { allowed: false, reason: 'Not authenticated' };
      }

      // Still loading permissions
      if (isLoading) {
        return { allowed: false, reason: 'Loading permissions' };
      }

      // Platform admin can do everything
      if (isPlatformAdmin) {
        return { allowed: true };
      }

      // Get permission requirements for this action+resource
      const requirements = permissionMatrix[resource]?.[action];
      if (!requirements) {
        return { allowed: false, reason: 'Unknown action or resource' };
      }

      // Check owner-only restriction
      if (requirements.ownerOnly) {
        if (!isCompanyOwner) {
          return { allowed: false, reason: 'Only company owner can perform this action' };
        }
        return { allowed: true };
      }

      // Check admin-only restriction
      if (requirements.adminOnly) {
        if (!isCompanyAdmin && !isCompanyOwner) {
          return { allowed: false, reason: 'Only company admin can perform this action' };
        }
        return { allowed: true };
      }

      // Company owner bypasses module and role checks (but not platform-level)
      if (isCompanyOwner) {
        return { allowed: true };
      }

      // Check module requirement
      if (requirements.module && !hasModule(requirements.module)) {
        return { allowed: false, reason: `Module "${requirements.module}" is not enabled` };
      }

      // Check role requirement
      if (requirements.roles && !hasRole(requirements.roles)) {
        return { allowed: false, reason: 'Insufficient role permissions' };
      }

      // Check permission requirement
      if (requirements.permission && !hasPermission(requirements.permission)) {
        return { allowed: false, reason: 'Insufficient permissions' };
      }

      return { allowed: true };
    };
  }, [user, isLoading, isPlatformAdmin, isCompanyOwner, isCompanyAdmin, userRole, modules, hasPermission]);

  return {
    can,
    isLoading,
    isPlatformAdmin,
    isCompanyOwner,
    isCompanyAdmin,
  };
}
