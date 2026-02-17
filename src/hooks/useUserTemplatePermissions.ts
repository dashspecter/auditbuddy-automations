import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';

export interface TemplatePermissionEntry {
  resource: string;
  action: string;
  granted: boolean;
}

/**
 * Fetches the current user's role template permissions for their active company.
 * Returns null if no template is assigned (signals fallback to legacy).
 * Returns the permission list if a template is assigned.
 */
export const useUserTemplatePermissions = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['user_template_permissions', user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return null;

      // 1. Find template assignments for this user in this company
      const { data: assignments, error: assignError } = await supabase
        .from('user_role_template_assignments')
        .select('template_id')
        .eq('company_id', company.id)
        .eq('user_id', user.id);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return null; // No template → legacy fallback

      // 2. Fetch permissions for all assigned templates (user could have multiple)
      const templateIds = assignments.map(a => a.template_id);

      const { data: permissions, error: permError } = await supabase
        .from('role_template_permissions')
        .select('resource, action, granted')
        .in('template_id', templateIds)
        .eq('granted', true);

      if (permError) throw permError;

      // 3. Deduplicate: if any template grants the permission, it's granted
      const permMap = new Map<string, TemplatePermissionEntry>();
      for (const p of (permissions || [])) {
        const key = `${p.resource}:${p.action}`;
        if (!permMap.has(key)) {
          permMap.set(key, { resource: p.resource, action: p.action, granted: true });
        }
      }

      return Array.from(permMap.values());
    },
    enabled: !!user?.id && !!company?.id,
    staleTime: 15 * 60 * 1000, // 15 min — templates rarely change
  });
};
