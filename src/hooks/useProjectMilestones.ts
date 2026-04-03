import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'missed';

export interface ProjectMilestone {
  id: string;
  company_id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  completed_at: string | null;
  evidence_packet_id: string | null;
  created_at: string;
}

export function useProjectMilestones(projectId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('gov_project_milestones' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId && !!company?.id,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payload: Pick<ProjectMilestone, 'project_id' | 'title'> & Partial<Pick<ProjectMilestone, 'description' | 'due_date'>>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('gov_project_milestones' as any)
        .insert({ ...payload, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectMilestone;
    },
    onSuccess: (_, { project_id }) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', project_id] });
      toast.success('Milestone added');
    },
    onError: (e: Error) => toast.error('Failed to add milestone: ' + e.message),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...payload }: Partial<ProjectMilestone> & { id: string; project_id: string }) => {
      const updates: Record<string, unknown> = { ...payload };
      if (payload.status === 'completed' && !payload.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('gov_project_milestones' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, project_id } as ProjectMilestone;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', result.project_id] });
    },
    onError: (e: Error) => toast.error('Failed to update milestone: ' + e.message),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from('gov_project_milestones' as any).delete().eq('id', id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', project_id] });
      toast.success('Milestone deleted');
    },
    onError: (e: Error) => toast.error('Failed to delete milestone: ' + e.message),
  });
}
