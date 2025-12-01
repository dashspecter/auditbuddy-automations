import { User } from '@supabase/supabase-js';

export interface RoleData {
  isAdmin: boolean;
  isManager: boolean;
  isChecker: boolean;
  roles: string[];
}

export interface CompanyData {
  id: string;
  name: string;
  subscription_tier: string;
  status: string;
  trial_ends_at?: string;
}

/**
 * Check if user has a specific role
 */
export const hasRole = (roleData: RoleData | null | undefined, role: 'admin' | 'manager' | 'checker'): boolean => {
  if (!roleData) return false;
  
  switch (role) {
    case 'admin':
      return roleData.isAdmin;
    case 'manager':
      return roleData.isManager;
    case 'checker':
      return roleData.isChecker;
    default:
      return false;
  }
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roleData: RoleData | null | undefined, roles: string[]): boolean => {
  if (!roleData) return false;
  return roles.some(role => roleData.roles.includes(role));
};

/**
 * Check if user can access a module
 */
export const canAccessModule = (
  tier: string,
  moduleName: string,
  activeModules: string[]
): boolean => {
  // Check if module is active for the company
  if (!activeModules.includes(moduleName)) {
    return false;
  }

  // Add tier-based restrictions here if needed
  // For now, if module is active, user can access it
  return true;
};

/**
 * Check if user is admin or manager
 */
export const isAdminOrManager = (roleData: RoleData | null | undefined): boolean => {
  return hasRole(roleData, 'admin') || hasRole(roleData, 'manager');
};

/**
 * Get user display name from email
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user?.email) return 'User';
  return user.email.split('@')[0];
};

/**
 * Get initials from email
 */
export const getUserInitials = (user: User | null): string => {
  if (!user?.email) return 'U';
  return user.email.substring(0, 2).toUpperCase();
};
