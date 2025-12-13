import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_role', user?.id],
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
      
      // Determine admin/manager status from both sources
      // company_owner and company_admin should be treated as admin
      const isCompanyAdmin = companyRole === 'company_owner' || companyRole === 'company_admin';
      const isCompanyManager = companyRole === 'manager';
      
      const roleData = {
        isAdmin: platformRoles.includes('admin') || isCompanyAdmin,
        isManager: platformRoles.includes('manager') || isCompanyManager,
        isChecker: platformRoles.includes('checker') && !isCompanyAdmin && !isCompanyManager,
        isHR: platformRoles.includes('hr'),
        roles: platformRoles,
        companyRole,
      };
      
      console.log('[useUserRole] Role data for', user.email, ':', roleData);
      return roleData;
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 500,
    staleTime: 5 * 60 * 1000,
  });
};
