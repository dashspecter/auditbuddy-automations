import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ScoutAuthState {
  isScout: boolean;
  scoutId: string | null;
  scoutStatus: string | null;
  isActive: boolean;
  isPending: boolean;
  isLoading: boolean;
}

export function useScoutAuth(): ScoutAuthState {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['scout-auth', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if user has scout role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'scout');

      if (!roles || roles.length === 0) {
        return { isScout: false, scoutId: null, scoutStatus: null };
      }

      // Get scout record
      const { data: scout } = await supabase
        .from('scouts')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      return {
        isScout: true,
        scoutId: scout?.id || null,
        scoutStatus: scout?.status || null,
      };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return {
    isScout: data?.isScout ?? false,
    scoutId: data?.scoutId ?? null,
    scoutStatus: data?.scoutStatus ?? null,
    isActive: data?.scoutStatus === 'active',
    isPending: data?.scoutStatus === 'pending',
    isLoading,
  };
}
