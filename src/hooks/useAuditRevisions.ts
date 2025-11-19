import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditRevision {
  id: string;
  audit_id: string;
  changed_by: string;
  changed_at: string;
  revision_number: number;
  changes: Record<string, { old: any; new: any }>;
  change_summary: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export const useAuditRevisions = (auditId: string) => {
  return useQuery({
    queryKey: ['audit_revisions', auditId],
    queryFn: async () => {
      // Fetch revisions
      const { data: revisions, error: revisionsError } = await supabase
        .from('audit_revisions')
        .select('*')
        .eq('audit_id', auditId)
        .order('revision_number', { ascending: false });

      if (revisionsError) throw revisionsError;
      if (!revisions) return [];

      // Fetch profiles for each revision
      const userIds = [...new Set(revisions.map(r => r.changed_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return revisions.map(revision => ({
        ...revision,
        changes: revision.changes as Record<string, { old: any; new: any }>,
        profiles: profilesMap.get(revision.changed_by) || null,
      })) as AuditRevision[];
    },
    enabled: !!auditId,
  });
};

export const useCreateAuditRevision = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      auditId,
      changes,
      changeSummary,
    }: {
      auditId: string;
      changes: Record<string, { old: any; new: any }>;
      changeSummary?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get next revision number
      const { data: revisionNumber, error: funcError } = await supabase
        .rpc('get_next_revision_number', { p_audit_id: auditId });

      if (funcError) throw funcError;

      // Create revision record
      const { data, error } = await supabase
        .from('audit_revisions')
        .insert([{
          audit_id: auditId,
          changed_by: user.id,
          revision_number: revisionNumber,
          changes: changes,
          change_summary: changeSummary || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit_revisions', variables.auditId] });
    },
  });
};
