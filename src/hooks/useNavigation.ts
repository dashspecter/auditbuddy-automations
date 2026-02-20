import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  navigationItems, 
  settingsItems, 
  NavItem, 
  SubNavItem, 
  SettingsNavItem 
} from '@/config/navigationConfig';
import { useUserRole } from '@/hooks/useUserRole';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { usePermissions, CompanyPermission } from '@/hooks/useCompanyPermissions';
import { useCompany, useCompanyModules } from '@/hooks/useCompany';

interface NavigationState {
  isLoading: boolean;
  isReady: boolean;
  visibleNavItems: NavItem[];
  visibleSettingsItems: SettingsNavItem[];
  activeItem: NavItem | null;
  activeSubItem: SubNavItem | null;
}

/**
 * useNavigation - Centralized hook for navigation visibility and state
 */
export function useNavigation(): NavigationState {
  const location = useLocation();
  const { company: companyContext, modules: contextModules, hasModule: contextHasModule } = useCompanyContext();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: modules, isLoading: modulesLoading } = useCompanyModules();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Extract role info
  const userRole = roleData?.roles?.[0] || null;
  const isPlatformAdmin = roleData?.isAdmin || false;
  const isCompanyOwner = roleData?.companyRole === 'company_owner';
  const isCompanyAdmin = roleData?.isCompanyAdmin || false;

  const isLoading = companyLoading || roleLoading || modulesLoading || permissionsLoading;
  const isReady = !isLoading && !!company;

  const hasModule = (moduleName: string | null): boolean => {
    if (!moduleName) return true;
    return contextHasModule(moduleName);
  };

  const hasRole = (allowedRoles: string[] | undefined): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!userRole) return false;
    // company_admin should match 'admin' in allowedRoles
    if (isCompanyAdmin && allowedRoles.includes('admin')) return true;
    return allowedRoles.includes(userRole);
  };

  const checkPermission = (permission: CompanyPermission | undefined): boolean => {
    if (!permission) return true;
    if (isPlatformAdmin || isCompanyOwner) return true;
    return hasPermission(permission);
  };

  // Determine if a navigation item should be visible
  const shouldShowItem = (item: NavItem): boolean => {
    // Check module access
    if (!hasModule(item.module)) return false;
    
    // Platform admin can see everything
    if (isPlatformAdmin) return true;
    
    // Company owner can see everything in their company
    if (isCompanyOwner) return hasModule(item.module);
    
    // Company admin has broad access
    if (isCompanyAdmin && hasModule(item.module)) {
      // Still respect specific role restrictions if defined
      if (item.allowedRoles && !hasRole(item.allowedRoles)) {
        return false;
      }
      return true;
    }
    
    // Check role-based access
    if (item.allowedRoles && !hasRole(item.allowedRoles)) return false;
    
    // Check permission-based access
    if (item.companyPermission && !checkPermission(item.companyPermission)) return false;
    
    return true;
  };

  // Determine if a sub-item should be visible
  const shouldShowSubItem = (subItem: SubNavItem): boolean => {
    // Platform admin can see everything
    if (isPlatformAdmin) return true;
    
    // Company owner can see everything
    if (isCompanyOwner) return true;
    
    // Check role-based access
    if (subItem.allowedRoles && !hasRole(subItem.allowedRoles)) return false;
    
    // Check permission-based access
    if (subItem.companyPermission && !checkPermission(subItem.companyPermission)) return false;
    
    return true;
  };

  // Determine if a settings item should be visible
  const shouldShowSettingsItem = (item: SettingsNavItem): boolean => {
    if (item.requiresPlatformAdmin && !isPlatformAdmin) return false;
    if (item.requiresOwner && !isCompanyOwner && !isPlatformAdmin) return false;
    if (item.requiresCompanyAdmin && !isCompanyAdmin && !isCompanyOwner && !isPlatformAdmin) return false;
    return true;
  };

  // Compute visible navigation items
  const visibleNavItems = useMemo(() => {
    if (!isReady) return [];
    
    return navigationItems
      .filter(shouldShowItem)
      .map(item => ({
        ...item,
        subItems: item.subItems?.filter(shouldShowSubItem)
      }));
  }, [isReady, userRole, modules, isPlatformAdmin, isCompanyOwner, isCompanyAdmin]);

  // Compute visible settings items
  const visibleSettingsItems = useMemo(() => {
    if (!isReady) return [];
    return settingsItems.filter(shouldShowSettingsItem);
  }, [isReady, isPlatformAdmin, isCompanyOwner, isCompanyAdmin]);

  // Find active navigation item based on current route
  const { activeItem, activeSubItem } = useMemo(() => {
    const currentPath = location.pathname;
    
    for (const item of visibleNavItems) {
      // Check exact match first
      if (currentPath === item.url) {
        return { activeItem: item, activeSubItem: null };
      }
      
      // Check sub-items
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (currentPath === subItem.url || currentPath.startsWith(subItem.url + '/')) {
            return { activeItem: item, activeSubItem: subItem };
          }
          
          // Check nested items
          if (subItem.nestedItems) {
            for (const nestedItem of subItem.nestedItems) {
              if (currentPath === nestedItem.url || currentPath.startsWith(nestedItem.url)) {
                return { activeItem: item, activeSubItem: subItem };
              }
            }
          }
        }
      }
      
      // Check if current path starts with item url (for catch-all)
      if (currentPath.startsWith(item.url + '/')) {
        return { activeItem: item, activeSubItem: null };
      }
    }
    
    return { activeItem: null, activeSubItem: null };
  }, [location.pathname, visibleNavItems]);

  return {
    isLoading,
    isReady,
    visibleNavItems,
    visibleSettingsItems,
    activeItem,
    activeSubItem,
  };
}

/**
 * Check if a specific route is active
 */
export function useIsRouteActive(path: string): boolean {
  const location = useLocation();
  return location.pathname === path || location.pathname.startsWith(path + '/');
}
