import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CmmsVendor {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  locations?: { id: string; name: string }[];
}

export function useCmmsVendors() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-vendors', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_vendors')
        .select(`
          *,
          cmms_vendor_locations(
            location_id,
            locations(id, name)
          )
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      
      return data.map(v => ({
        ...v,
        locations: v.cmms_vendor_locations?.map((vl: any) => vl.locations).filter(Boolean) || []
      })) as CmmsVendor[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCmmsVendor() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      location_ids?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyData?.id) throw new Error('Not authenticated');

      const { data: vendor, error } = await supabase
        .from('cmms_vendors')
        .insert({
          company_id: companyData.id,
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add location associations
      if (data.location_ids?.length) {
        const { error: locError } = await supabase
          .from('cmms_vendor_locations')
          .insert(data.location_ids.map(lid => ({
            vendor_id: vendor.id,
            location_id: lid,
          })));
        if (locError) throw locError;
      }

      return vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-vendors'] });
      toast.success('Vendor created');
    },
    onError: (error) => {
      toast.error('Failed to create vendor: ' + error.message);
    },
  });
}

export function useUpdateCmmsVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      is_archived?: boolean;
    }) => {
      const { error } = await supabase
        .from('cmms_vendors')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-vendors'] });
      toast.success('Vendor updated');
    },
    onError: (error) => {
      toast.error('Failed to update vendor: ' + error.message);
    },
  });
}
