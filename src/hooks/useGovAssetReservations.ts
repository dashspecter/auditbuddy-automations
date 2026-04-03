import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export type ReservationStatus = 'tentative' | 'confirmed' | 'cancelled';

export interface GovAssetReservation {
  id: string;
  company_id: string;
  asset_id: string;
  project_id: string | null;
  reserved_by: string;
  start_date: string;
  end_date: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  asset?: { id: string; name: string; asset_code: string } | null;
  project?: { id: string; title: string; project_number: string | null } | null;
}

export interface ReservationFilters {
  asset_id?: string;
  project_id?: string;
  from_date?: string;
  to_date?: string;
  status?: ReservationStatus[];
}

export function useGovAssetReservations(filters?: ReservationFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['gov-asset-reservations', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('gov_asset_reservations')
        .select(`
          *,
          asset:cmms_assets(id, name, asset_code),
          project:gov_projects(id, title, project_number)
        `)
        .eq('company_id', company.id)
        .order('start_date', { ascending: true });

      if (filters?.asset_id) query = query.eq('asset_id', filters.asset_id);
      if (filters?.project_id) query = query.eq('project_id', filters.project_id);
      if (filters?.from_date) query = query.gte('end_date', filters.from_date);
      if (filters?.to_date) query = query.lte('start_date', filters.to_date);
      if (filters?.status?.length) query = query.in('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as GovAssetReservation[];
    },
    enabled: !!company?.id,
    staleTime: 2 * 60_000,
  });
}

export function useCreateGovAssetReservation() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payload: {
      asset_id: string;
      project_id?: string;
      start_date: string;
      end_date: string;
      status?: ReservationStatus;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gov_asset_reservations')
        .insert({
          company_id: company.id,
          reserved_by: user.id,
          asset_id: payload.asset_id,
          project_id: payload.project_id ?? null,
          start_date: payload.start_date,
          end_date: payload.end_date,
          status: payload.status ?? 'confirmed',
          notes: payload.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GovAssetReservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-asset-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-availability'] });
      toast.success('Asset reserved');
    },
    onError: (e: Error) => toast.error('Failed to reserve asset: ' + e.message),
  });
}

export function useUpdateGovAssetReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<Pick<GovAssetReservation, 'status' | 'notes' | 'start_date' | 'end_date'>>) => {
      const { data, error } = await supabase
        .from('gov_asset_reservations')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GovAssetReservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-asset-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-availability'] });
    },
    onError: (e: Error) => toast.error('Failed to update reservation: ' + e.message),
  });
}

export function useDeleteGovAssetReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gov_asset_reservations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-asset-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-availability'] });
      toast.success('Reservation cancelled');
    },
    onError: (e: Error) => toast.error('Failed to cancel reservation: ' + e.message),
  });
}
