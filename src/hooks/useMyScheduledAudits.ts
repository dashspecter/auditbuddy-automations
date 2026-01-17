import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch scheduled audits for the current user on mobile.
 * Uses the SAME data source as the web calendar (location_audits with scheduled_start).
 * 
 * Filters: Shows audits where the user is:
 * - assigned_user_id (assigned to perform the audit)
 * - OR user_id (created the audit)
 * 
 * Sorts by scheduled_start ascending (nearest scheduled audit first).
 */
export const useMyScheduledAudits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my_scheduled_audits', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Query same source as calendar: location_audits with scheduled_start
      // Filter for audits assigned to OR created by the current user
      const { data, error } = await supabase
        .from('location_audits')
        .select(`
          *,
          profiles:assigned_user_id(full_name, email),
          audit_templates(name, template_type),
          locations(name, city)
        `)
        .not('scheduled_start', 'is', null)
        .or(`assigned_user_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      
      // Dedupe by audit id (in case of any join fan-out, though unlikely here)
      const seen = new Set<string>();
      const deduped = (data || []).filter((audit) => {
        if (seen.has(audit.id)) return false;
        seen.add(audit.id);
        return true;
      });

      return deduped;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch ALL audits for the current user (scheduled + completed + drafts).
 * Used for stats and full audit list on mobile.
 * 
 * Filters: Shows audits where the user is:
 * - assigned_user_id (assigned to perform the audit)
 * - OR user_id (created the audit)
 */
export const useMyAudits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my_all_audits', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('location_audits')
        .select(`
          *,
          profiles:assigned_user_id(full_name, email),
          audit_templates(name, template_type),
          locations(name, city)
        `)
        .or(`assigned_user_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Dedupe by audit id
      const seen = new Set<string>();
      const deduped = (data || []).filter((audit) => {
        if (seen.has(audit.id)) return false;
        seen.add(audit.id);
        return true;
      });

      return deduped;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};
