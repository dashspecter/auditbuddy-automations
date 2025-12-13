import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_role', user?.id, 'v2'], // Added version to bust cache
    queryFn: async () => {
      if (!user) {
        console.log('[useUserRole] No user, returning null');
        return null;
      }

      console.log('[useUserRole] Fetching roles for user:', user.id, user.email);
      
      // Fetch both user_roles and company_users in parallel
      const [userRolesResult, companyUserResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        supabase
          .from('company_users')
          .select('company_role')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (userRolesResult.error) {
        console.error('[useUserRole] Error fetching user_roles:', userRolesResult.error);
      }
      
      if (companyUserResult.error) {
        console.error('[useUserRole] Error fetching company_users:', companyUserResult.error);
      }
      
      const platformRoles = userRolesResult.data?.map(r => r.role) || [];
      const companyRole = companyUserResult.data?.company_role;
      
      // IMPORTANT: isAdmin is ONLY for platform admins (user_roles.role = 'admin')
      // company_owner/company_admin should get isManager = true, NOT isAdmin
      const isPlatformAdmin = platformRoles.includes('admin');
      const isCompanyAdmin = companyRole === 'company_owner' || companyRole === 'company_admin';
      const isCompanyManager = companyRole === 'manager';
      
      const roleData = {
        // isAdmin = ONLY platform admins (for Platform Admin, System Health, Debug pages)
        isAdmin: isPlatformAdmin,
        // isManager = platform managers OR company admins/owners/managers (for Admin Dashboard)
        isManager: platformRoles.includes('manager') || isCompanyAdmin || isCompanyManager,
        // isChecker = only if not admin/manager at any level
        isChecker: platformRoles.includes('checker') && !isPlatformAdmin && !isCompanyAdmin && !isCompanyManager,
        isHR: platformRoles.includes('hr'),
        roles: platformRoles,
        companyRole,
        // Expose this for components that need to check company-level admin status
        isCompanyAdmin,
      };
      
      console.log('[useUserRole] Role data for', user.email, ':', roleData);
      return roleData;
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 500,
    staleTime: 0, // Always refetch to ensure fresh role data
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
};
