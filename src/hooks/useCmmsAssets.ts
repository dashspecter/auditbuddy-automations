import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CmmsAsset {
  id: string;
  company_id: string;
  name: string;
  asset_code: string;
  category_id: string | null;
  location_id: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  year: number | null;
  warranty_expiry: string | null;
  criticality: 'Low' | 'Medium' | 'High';
  meter_type: string | null;
  meter_current_value: number | null;
  status: 'Active' | 'Down' | 'Retired';
  qr_token: string | null;
  qr_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_archived: boolean;
  // Joined data
  location?: { id: string; name: string } | null;
  category?: { id: string; name: string; icon: string | null } | null;
}

export interface AssetFilters {
  status?: string[];
  criticality?: string[];
  location_id?: string;
  category_id?: string;
  search?: string;
}

export function useCmmsAssets(filters?: AssetFilters) {
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useQuery({
    queryKey: ['cmms-assets', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('cmms_assets')
        .select(`
          *,
          location:locations(id, name),
          category:asset_categories(id, name, icon)
        `)
        .eq('company_id', company.id)
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.criticality?.length) {
        query = query.in('criticality', filters.criticality);
      }
      if (filters?.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CmmsAsset[];
    },
    enabled: !!company?.id,
  });
}

export function useCmmsAssetById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-asset', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('cmms_assets')
        .select(`
          *,
          location:locations(id, name),
          category:asset_categories(id, name, icon)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsAsset;
    },
    enabled: !!id,
  });
}

export function useCreateCmmsAsset() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async (data: Partial<CmmsAsset>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !company?.id) throw new Error('Not authenticated');

      // Generate QR token
      const qrToken = crypto.randomUUID();
      const qrUrl = `${window.location.origin}/cmms/asset/${qrToken}`;

      const insertData = {
        name: data.name || '',
        asset_code: data.asset_code || '',
        company_id: company.id,
        created_by: userData.user.id,
        status: data.status || 'Active',
        criticality: data.criticality || 'Medium',
        location_id: data.location_id,
        category_id: data.category_id,
        brand: data.brand,
        model: data.model,
        serial_number: data.serial_number,
        year: data.year,
        warranty_expiry: data.warranty_expiry,
        meter_type: data.meter_type,
        notes: data.notes,
        qr_token: qrToken,
        qr_url: qrUrl,
      };

      const { data: result, error } = await supabase
        .from('cmms_assets')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('cmms_audit_log').insert({
        company_id: company.id,
        actor_user_id: userData.user.id,
        action: 'create',
        entity_type: 'asset',
        entity_id: result.id,
        metadata_json: { name: data.name, asset_code: data.asset_code },
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-assets'] });
      toast.success('Asset created');
    },
    onError: (error) => {
      toast.error('Failed to create asset: ' + error.message);
    },
  });
}

export function useUpdateCmmsAsset() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CmmsAsset> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('cmms_assets')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      if (company?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: company.id,
          actor_user_id: userData.user.id,
          action: 'update',
          entity_type: 'asset',
          entity_id: id,
          metadata_json: data,
        });
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-assets'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-asset', variables.id] });
    },
    onError: (error) => {
      toast.error('Failed to update asset: ' + error.message);
    },
  });
}

// Asset Categories
export function useCmmsAssetCategories() {
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useQuery({
    queryKey: ['cmms-asset-categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateCmmsAssetCategory() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !company?.id) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('asset_categories')
        .insert({
          name: data.name,
          icon: data.icon,
          company_id: company.id,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-asset-categories'] });
      toast.success('Category created');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    },
  });
}

// Get asset by QR token (for scanning)
export function useCmmsAssetByQrToken(token: string | undefined) {
  return useQuery({
    queryKey: ['cmms-asset-qr', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('cmms_assets')
        .select(`
          *,
          location:locations(id, name),
          category:asset_categories(id, name, icon)
        `)
        .eq('qr_token', token)
        .single();

      if (error) throw error;
      return data as CmmsAsset;
    },
    enabled: !!token,
  });
}
