import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export type ZoneType = 'region' | 'district' | 'ward' | 'zone' | 'department';

export interface GovZone {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  parent_zone_id: string | null;
  zone_type: ZoneType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  children?: GovZone[];
  parent?: Pick<GovZone, 'id' | 'name'> | null;
}

export function useGovZones() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['gov-zones', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('gov_zones' as any)
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as unknown as GovZone[];
    },
    enabled: !!company?.id,
    staleTime: 15 * 60 * 1000,
  });
}

export function useCreateGovZone() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payload: Pick<GovZone, 'name' | 'zone_type'> & Partial<Pick<GovZone, 'code' | 'description' | 'parent_zone_id'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gov_zones' as any)
        .insert({ ...payload, company_id: company.id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GovZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-zones'] });
      toast.success('Zone created');
    },
    onError: (e: Error) => toast.error('Failed to create zone: ' + e.message),
  });
}

export function useUpdateGovZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<GovZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('gov_zones' as any)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GovZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-zones'] });
      toast.success('Zone updated');
    },
    onError: (e: Error) => toast.error('Failed to update zone: ' + e.message),
  });
}

export function useDeleteGovZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gov_zones' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-zones'] });
      toast.success('Zone deleted');
    },
    onError: (e: Error) => toast.error('Failed to delete zone: ' + e.message),
  });
}
