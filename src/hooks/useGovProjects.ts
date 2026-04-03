import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType =
  | 'infrastructure'
  | 'maintenance'
  | 'sanitation'
  | 'parks'
  | 'construction'
  | 'inspection'
  | 'emergency';

export interface GovProject {
  id: string;
  company_id: string;
  zone_id: string | null;
  location_id: string | null;
  title: string;
  description: string | null;
  project_number: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  project_type: ProjectType;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  actual_cost: number;
  project_manager_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  // Joined
  zone?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  project_manager?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface GovProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  project_type?: ProjectType[];
  zone_id?: string;
  search?: string;
  manager_id?: string;
}

export function useGovProjects(filters?: GovProjectFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['gov-projects', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('gov_projects' as any)
        .select(`
          *,
          zone:gov_zones(id, name),
          location:locations(id, name),
          project_manager:employees(id, full_name, avatar_url)
        `)
        .eq('company_id', company.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) query = query.in('status', filters.status);
      if (filters?.priority?.length) query = query.in('priority', filters.priority);
      if (filters?.project_type?.length) query = query.in('project_type', filters.project_type);
      if (filters?.zone_id) query = query.eq('zone_id', filters.zone_id);
      if (filters?.manager_id) query = query.eq('project_manager_id', filters.manager_id);
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,project_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GovProject[];
    },
    enabled: !!company?.id,
  });
}

export function useGovProjectById(id: string | undefined) {
  return useQuery({
    queryKey: ['gov-project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('gov_projects' as any)
        .select(`
          *,
          zone:gov_zones(id, name),
          location:locations(id, name),
          project_manager:employees(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as GovProject;
    },
    enabled: !!id,
  });
}

export function useCreateGovProject() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payload: Omit<GovProject, 'id' | 'company_id' | 'project_number' | 'actual_cost' | 'created_by' | 'created_at' | 'updated_at' | 'is_archived' | 'zone' | 'location' | 'project_manager'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gov_projects' as any)
        .insert({ ...payload, company_id: company.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GovProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-projects'] });
      toast.success('Project created');
    },
    onError: (e: Error) => toast.error('Failed to create project: ' + e.message),
  });
}

export function useUpdateGovProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<GovProject> & { id: string }) => {
      const { data, error } = await supabase
        .from('gov_projects' as any)
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GovProject;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['gov-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gov-project', id] });
      toast.success('Project updated');
    },
    onError: (e: Error) => toast.error('Failed to update project: ' + e.message),
  });
}

export function useDeleteGovProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gov_projects' as any)
        .update({ is_archived: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-projects'] });
      toast.success('Project archived');
    },
    onError: (e: Error) => toast.error('Failed to archive project: ' + e.message),
  });
}
