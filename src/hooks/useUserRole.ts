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
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('[useUserRole] Error fetching roles:', error);
        throw error;
      }
      
      const roles = data?.map(r => r.role) || [];
      const roleData = {
        isAdmin: roles.includes('admin'),
        isManager: roles.includes('manager'),
        isChecker: roles.includes('checker'),
        isHR: roles.includes('hr'),
        roles,
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
