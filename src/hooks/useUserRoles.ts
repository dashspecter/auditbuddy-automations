import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';

export const useUserRoles = () => {
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['user_roles_full', user?.id, company?.id],
    queryFn: async () => {
      if (!user) return null;

      console.log('[useUserRoles] Fetching all roles for user:', user.id);
      
      // Fetch platform role
      const { data: platformRoles, error: platformError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (platformError) {
        console.error('[useUserRoles] Error fetching platform roles:', platformError);
        throw platformError;
      }
      
      const roles = platformRoles?.map(r => r.role) || [];
      const platformRole = roles.includes('admin') ? 'admin' : 
                          roles.includes('manager') ? 'manager' : 
                          roles.includes('checker') ? 'checker' : null;

      // Fetch company role if company exists
      let companyRole = null;
      if (company?.id) {
        const { data: companyRoleData, error: companyError } = await supabase
          .from('company_users')
          .select('company_role')
          .eq('user_id', user.id)
          .eq('company_id', company.id)
          .single();

        if (!companyError && companyRoleData) {
          companyRole = companyRoleData.company_role;
        }
      }
      
      const roleData = {
        platformRole,
        companyRole,
        isAdmin: roles.includes('admin'),
        isManager: roles.includes('manager'),
        isChecker: roles.includes('checker'),
        roles,
      };
      
      console.log('[useUserRoles] Full role data:', roleData);
      return roleData;
    },
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes - roles rarely change
  });
};
