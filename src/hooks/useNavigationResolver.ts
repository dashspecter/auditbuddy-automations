/**
 * Navigation Resolution Hook
 * 
 * Resolves which navigation items should be visible based on:
 * - User's platform roles (admin, manager, checker, hr)
 * - Company roles (owner, admin, member)
 * - Company permissions
 * - Enabled modules
 * - Loading states
 * 
 * CRITICAL: Returns 'loading' status until ALL dependencies are ready.
 * This prevents partial menu rendering that causes "missing items" bugs.
 */

import { useMemo } from 'react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useCompany } from '@/hooks/useCompany';
import { usePermissions, CompanyPermission } from '@/hooks/useCompanyPermissions';
import { logNavResolve, logDebug } from '@/lib/debug/logger';
import {
  navigationItems,
  settingsItems,
  NavigationItem,
  NavigationSubItem,
  NavigationStatus,
  ResolvedNavigation,
  PlatformRole,
} from '@/config/navigation';

interface UseNavigationResolverResult extends ResolvedNavigation {
  /** Re-resolve navigation (for testing) */
  refresh: () => void;
}

/**
 * Hook to resolve visible navigation items
 * 
 * @returns Resolved navigation with status
 */
export function useNavigationResolver(): UseNavigationResolverResult {
  const { hasModule, canAccessModule, isLoading: modulesLoading } = useCompanyContext();
  const { data: roleData, isLoading: rolesLoading } = useUserRole();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Derive company roles
  const isOwner = company?.userRole === 'company_owner';
  const isCompanyAdmin = company?.userRole === 'company_admin';
  const isMember = company?.userRole === 'company_member';
  const hasPlatformAdminRole = roleData?.roles?.includes('admin') === true;

  // Calculate loading state
  const isLoading = modulesLoading || rolesLoading || companyLoading || permissionsLoading;

  // Resolution logic
  const resolved = useMemo((): ResolvedNavigation => {
    const startTime = performance.now();

    // CRITICAL: If any dependency is loading, return loading state
    // This prevents partial menu rendering
    if (isLoading) {
      logDebug('nav-resolver', 'Dependencies still loading', {
        modulesLoading,
        rolesLoading,
        companyLoading,
        permissionsLoading
      });
      return {
        status: 'loading',
        mainItems: [],
        settingsItems: [],
      };
    }

    // If no role data, we can't determine visibility
    // But we should still render something to avoid blank menu
    // Default to showing minimal items
    if (!roleData) {
      logDebug('nav-resolver', 'No role data, showing minimal items');
      return {
        status: 'ready',
        mainItems: navigationItems.filter(item => item.id === 'home'),
        settingsItems: [],
      };
    }

    /**
     * Check if user has one of the allowed platform roles
     */
    const hasAllowedRole = (allowedRoles?: PlatformRole[]): boolean => {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      
      // Company owners and platform admins have access to everything
      if (isOwner || hasPlatformAdminRole) return true;
      
      if (roleData.isManager && allowedRoles.includes('manager')) return true;
      if (roleData.isChecker && allowedRoles.includes('checker')) return true;
      if (roleData.isHR && allowedRoles.includes('hr')) return true;
      
      return false;
    };

    /**
     * Check if a navigation item should be visible
     */
    const shouldShowItem = (item: NavigationItem): boolean => {
      // Check module access (includes tier check)
      if (item.module && !canAccessModule(item.module)) {
        return false;
      }

      // Check requiresPlatformAdmin - ONLY users with 'admin' role in user_roles table
      if (item.requiresPlatformAdmin) {
        return hasPlatformAdminRole;
      }

      // Check requiresOwner - MUST be company owner
      if (item.requiresOwner) {
        return isOwner === true;
      }

      // Check requiresOwnerOrAdmin - MUST be company owner OR company admin
      if (item.requiresOwnerOrAdmin) {
        return isOwner === true || isCompanyAdmin === true;
      }

      // Company owners, company admins, and platform admins have access to other items
      if (isOwner || isCompanyAdmin || hasPlatformAdminRole) {
        return true;
      }

      // For company members, ONLY check company permissions (not platform roles)
      if (isMember) {
        if (item.companyPermission) {
          return hasPermission(item.companyPermission);
        }
        return true;
      }

      // For platform users, check role requirements
      if (item.allowedRoles && item.allowedRoles.length > 0) {
        return hasAllowedRole(item.allowedRoles);
      }

      return true;
    };

    /**
     * Check if a sub-item should be visible
     */
    const shouldShowSubItem = (subItem: NavigationSubItem): boolean => {
      // Check module access
      if (subItem.module && !canAccessModule(subItem.module)) {
        return false;
      }

      // Company owners and admins have access
      if (isOwner || isCompanyAdmin) {
        return true;
      }

      // For company members, check permissions
      if (isMember) {
        if (subItem.companyPermission) {
          return hasPermission(subItem.companyPermission);
        }
        return true;
      }

      // For platform users, check allowed roles
      if (subItem.allowedRoles && !hasAllowedRole(subItem.allowedRoles)) {
        return false;
      }

      return true;
    };

    /**
     * Filter items and their sub-items
     */
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .filter(shouldShowItem)
        .map(item => ({
          ...item,
          subItems: item.subItems?.filter(shouldShowSubItem),
        }));
    };

    const visibleMainItems = filterItems(navigationItems);
    const visibleSettingsItems = filterItems(settingsItems);

    const elapsed = Math.round(performance.now() - startTime);
    logNavResolve(visibleMainItems.length + visibleSettingsItems.length, 'ready', elapsed);

    return {
      status: 'ready',
      mainItems: visibleMainItems,
      settingsItems: visibleSettingsItems,
    };
  }, [
    isLoading,
    modulesLoading,
    rolesLoading,
    companyLoading,
    permissionsLoading,
    roleData,
    isOwner,
    isCompanyAdmin,
    isMember,
    hasPlatformAdminRole,
    canAccessModule,
    hasPermission,
  ]);

  return {
    ...resolved,
    refresh: () => {
      // Force re-render by invalidating queries would go here
      // For now, this is a placeholder
      logDebug('nav-resolver', 'Manual refresh requested');
    },
  };
}

/**
 * Get flat list of all visible URLs for the current user
 */
export function useNavigationUrls(): string[] {
  const { mainItems, settingsItems, status } = useNavigationResolver();

  return useMemo(() => {
    if (status !== 'ready') return [];

    const urls: string[] = [];

    const collectUrls = (items: NavigationItem[]) => {
      items.forEach(item => {
        urls.push(item.url);
        item.subItems?.forEach(sub => {
          urls.push(sub.url);
          sub.nestedItems?.forEach(nested => urls.push(nested.url));
        });
      });
    };

    collectUrls(mainItems);
    collectUrls(settingsItems);

    return urls;
  }, [mainItems, settingsItems, status]);
}

/**
 * Check if a specific navigation item should be visible
 */
export function useCanAccessNavItem(itemId: string): boolean {
  const { mainItems, settingsItems, status } = useNavigationResolver();

  return useMemo(() => {
    if (status !== 'ready') return false;

    const allItems = [...mainItems, ...settingsItems];
    const item = allItems.find(i => i.id === itemId);

    if (!item) {
      // Also check sub-items
      for (const parent of allItems) {
        const subItem = parent.subItems?.find(s => s.id === itemId);
        if (subItem) return true;
      }
      return false;
    }

    return true;
  }, [mainItems, settingsItems, status, itemId]);
}
