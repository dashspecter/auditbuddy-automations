import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";

// =====================================================
// TYPES
// =====================================================

export interface WasteProduct {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  uom: string;
  cost_model: 'per_kg' | 'per_unit';
  unit_cost: number;
  active: boolean;
  photo_hint_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasteReason {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface WasteEntry {
  id: string;
  company_id: string;
  location_id: string;
  created_by: string;
  occurred_at: string;
  waste_product_id: string;
  waste_reason_id: string | null;
  weight_g: number;
  unit_cost_used: number;
  cost_total: number;
  notes: string | null;
  photo_path: string | null;
  status: 'recorded' | 'voided';
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  // Joined fields
  waste_products?: WasteProduct;
  waste_reasons?: WasteReason;
  locations?: { id: string; name: string };
  profiles?: { id: string; full_name: string | null; email: string };
}

export interface WasteThreshold {
  id: string;
  company_id: string;
  location_id: string | null;
  category: string | null;
  waste_product_id: string | null;
  threshold_type: 'daily_cost' | 'daily_weight_g';
  threshold_value: number;
  active: boolean;
  created_at: string;
}

export interface WasteReportKPIs {
  total_weight_kg: number;
  total_cost: number;
  entry_count: number;
  avg_cost_per_entry: number;
}

export interface WasteReportProduct {
  id: string;
  name: string;
  category: string | null;
  weight_kg: number;
  cost: number;
  entries: number;
}

export interface WasteReportCategory {
  category: string;
  weight_kg: number;
  cost: number;
  entries: number;
}

export interface WasteReportReason {
  reason: string;
  weight_kg: number;
  cost: number;
  entries: number;
}

export interface WasteReportTrend {
  day: string;
  weight_kg: number;
  cost: number;
  entries: number;
}

export interface WasteReport {
  kpis: WasteReportKPIs;
  top_products: WasteReportProduct[];
  by_category: WasteReportCategory[];
  by_reason: WasteReportReason[];
  daily_trend: WasteReportTrend[];
}

export interface WasteEntryFilters {
  locationIds?: string[];
  from?: Date;
  to?: Date;
  productId?: string;
  reasonId?: string;
  userId?: string;
  category?: string;
  status?: 'recorded' | 'voided' | 'all';
}

// =====================================================
// WASTE PRODUCTS HOOKS
// =====================================================

export const useWasteProducts = (activeOnly = true) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['waste_products', company?.id, activeOnly],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('waste_products')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WasteProduct[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateWasteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (product: Omit<WasteProduct, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('waste_products')
        .insert({
          ...product,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WasteProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_products'] });
      toast({ title: 'Success', description: 'Waste product created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateWasteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WasteProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('waste_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WasteProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_products'] });
      toast({ title: 'Success', description: 'Waste product updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// WASTE REASONS HOOKS
// =====================================================

export const useWasteReasons = (activeOnly = true) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['waste_reasons', company?.id, activeOnly],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('waste_reasons')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order');

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WasteReason[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateWasteReason = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (reason: Omit<WasteReason, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('waste_reasons')
        .insert({
          ...reason,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WasteReason;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_reasons'] });
      toast({ title: 'Success', description: 'Waste reason created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateWasteReason = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WasteReason> & { id: string }) => {
      const { data, error } = await supabase
        .from('waste_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WasteReason;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_reasons'] });
      toast({ title: 'Success', description: 'Waste reason updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// WASTE ENTRIES HOOKS
// =====================================================

export const useWasteEntries = (filters: WasteEntryFilters = {}) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['waste_entries', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('waste_entries')
        .select(`
          *,
          waste_products (id, name, category, uom),
          waste_reasons (id, name),
          locations (id, name)
        `)
        .eq('company_id', company.id)
        .order('occurred_at', { ascending: false });

      if (filters.locationIds && filters.locationIds.length > 0) {
        query = query.in('location_id', filters.locationIds);
      }
      if (filters.from) {
        query = query.gte('occurred_at', filters.from.toISOString());
      }
      if (filters.to) {
        query = query.lte('occurred_at', filters.to.toISOString());
      }
      if (filters.productId) {
        query = query.eq('waste_product_id', filters.productId);
      }
      if (filters.reasonId) {
        query = query.eq('waste_reason_id', filters.reasonId);
      }
      if (filters.userId) {
        query = query.eq('created_by', filters.userId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      // Cast to unknown first to handle partial nested types
      return (data as unknown) as WasteEntry[];
    },
    enabled: !!company?.id,
  });
};

export const useMyWasteEntries = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['my_waste_entries', user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return [];

      const { data, error } = await supabase
        .from('waste_entries')
        .select(`
          *,
          waste_products (id, name, category, uom),
          waste_reasons (id, name),
          locations (id, name)
        `)
        .eq('company_id', company.id)
        .eq('created_by', user.id)
        .order('occurred_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data as unknown) as WasteEntry[];
    },
    enabled: !!user?.id && !!company?.id,
  });
};

export const useCreateWasteEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (entry: {
      location_id: string;
      waste_product_id: string;
      waste_reason_id?: string;
      weight_g: number;
      notes?: string;
      photo_path?: string;
      occurred_at?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('waste_entries')
        .insert({
          ...entry,
          company_id: company.id,
          created_by: user.id,
          occurred_at: entry.occurred_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as WasteEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['my_waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['waste_report'] });
      toast({ title: 'Success', description: 'Waste entry recorded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateWasteEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WasteEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('waste_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WasteEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['my_waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['waste_report'] });
      toast({ title: 'Success', description: 'Waste entry updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useVoidWasteEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, void_reason }: { id: string; void_reason: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('waste_entries')
        .update({
          status: 'voided',
          voided_at: new Date().toISOString(),
          voided_by: user.id,
          void_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WasteEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['my_waste_entries'] });
      queryClient.invalidateQueries({ queryKey: ['waste_report'] });
      toast({ title: 'Success', description: 'Waste entry voided' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// WASTE REPORT HOOKS
// =====================================================

export const useWasteReport = (filters: WasteEntryFilters = {}) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['waste_report', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase.rpc('get_waste_report', {
        p_company_id: company.id,
        p_location_ids: filters.locationIds || null,
        p_from: filters.from?.toISOString() || null,
        p_to: filters.to?.toISOString() || null,
        p_product_id: filters.productId || null,
        p_reason_id: filters.reasonId || null,
        p_user_id: filters.userId || null,
        p_category: filters.category || null,
      });

      if (error) throw error;
      return (data as unknown) as WasteReport;
    },
    enabled: !!company?.id,
    staleTime: 60000, // 1 minute
  });
};

// =====================================================
// WASTE THRESHOLDS HOOKS
// =====================================================

export const useWasteThresholds = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['waste_thresholds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('waste_thresholds')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WasteThreshold[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateWasteThreshold = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (threshold: Omit<WasteThreshold, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('waste_thresholds')
        .insert({
          ...threshold,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WasteThreshold;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_thresholds'] });
      toast({ title: 'Success', description: 'Threshold created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateWasteThreshold = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WasteThreshold> & { id: string }) => {
      const { data, error } = await supabase
        .from('waste_thresholds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WasteThreshold;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_thresholds'] });
      toast({ title: 'Success', description: 'Threshold updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteWasteThreshold = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waste_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_thresholds'] });
      toast({ title: 'Success', description: 'Threshold deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// PHOTO UPLOAD HELPER
// =====================================================

export const uploadWastePhoto = async (
  companyId: string,
  locationId: string,
  entryId: string,
  file: File
): Promise<string> => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const path = `company/${companyId}/location/${locationId}/waste/${year}/${month}/${entryId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('waste-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  return path;
};

export const getWastePhotoUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;

  const { data } = await supabase.storage
    .from('waste-photos')
    .createSignedUrl(path, 3600); // 1 hour

  return data?.signedUrl || null;
};
