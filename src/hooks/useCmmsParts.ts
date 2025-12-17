import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CmmsPart {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  photo_url: string | null;
  minimum_qty: number | null;
  reorder_qty: number | null;
  avg_unit_cost: number | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CmmsPartStock {
  id: string;
  part_id: string;
  location_id: string | null;
  qty_on_hand: number;
  updated_at: string;
  location?: { id: string; name: string } | null;
}

export interface CmmsPartTransaction {
  id: string;
  part_id: string;
  location_id: string | null;
  qty_delta: number;
  reason: string | null;
  related_work_order_id: string | null;
  performed_by: string;
  created_at: string;
}

export function useCmmsParts() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-parts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_parts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      return data as CmmsPart[];
    },
    enabled: !!companyId,
  });
}

export function useCmmsPartById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-part', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('cmms_parts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsPart;
    },
    enabled: !!id,
  });
}

export function useCmmsPartStock(partId?: string, locationId?: string) {
  const { data: companyData } = useCompany();

  return useQuery({
    queryKey: ['cmms-part-stock', partId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('cmms_part_stock')
        .select('*, location:locations(id, name)');

      if (partId) {
        query = query.eq('part_id', partId);
      }
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CmmsPartStock[];
    },
    enabled: !!companyData?.id,
  });
}

export function useCreateCmmsPart() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (part: {
      name: string;
      sku?: string;
      unit?: string;
      minimum_qty?: number;
      reorder_qty?: number;
      avg_unit_cost?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      if (!companyData?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('cmms_parts')
        .insert({
          ...part,
          company_id: companyData.id,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('cmms_audit_log').insert({
        company_id: companyData.id,
        actor_user_id: userData.user.id,
        action: 'created',
        entity_type: 'part',
        entity_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-parts'] });
      toast.success('Part created');
    },
    onError: (error) => {
      toast.error('Failed to create part: ' + error.message);
    },
  });
}

export function useUpdateCmmsPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmmsPart> & { id: string }) => {
      const { data, error } = await supabase
        .from('cmms_parts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-parts'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-part', data.id] });
      toast.success('Part updated');
    },
    onError: (error) => {
      toast.error('Failed to update part: ' + error.message);
    },
  });
}

export function useRestockPart() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async ({
      partId,
      locationId,
      quantity,
      reason,
    }: {
      partId: string;
      locationId?: string;
      quantity: number;
      reason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Upsert stock
      let stockQuery = supabase
        .from('cmms_part_stock')
        .select('id, qty_on_hand')
        .eq('part_id', partId);
      
      if (locationId) {
        stockQuery = stockQuery.eq('location_id', locationId);
      } else {
        stockQuery = stockQuery.is('location_id', null);
      }
      
      const { data: existingStock } = await stockQuery.maybeSingle();

      if (existingStock) {
        await supabase
          .from('cmms_part_stock')
          .update({ qty_on_hand: existingStock.qty_on_hand + quantity })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('cmms_part_stock')
          .insert({
            part_id: partId,
            location_id: locationId || null,
            qty_on_hand: quantity,
          });
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('cmms_part_transactions')
        .insert({
          part_id: partId,
          location_id: locationId || null,
          qty_delta: quantity,
          reason: reason || 'Restock',
          performed_by: userData.user.id,
        });

      if (txError) throw txError;

      return { partId, quantity };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-part-stock'] });
      toast.success('Stock updated');
    },
    onError: (error) => {
      toast.error('Failed to update stock: ' + error.message);
    },
  });
}

export function useConsumePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partId,
      locationId,
      quantity,
      workOrderId,
      reason,
    }: {
      partId: string;
      locationId?: string;
      quantity: number;
      workOrderId?: string;
      reason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get current stock
      let stockQuery = supabase
        .from('cmms_part_stock')
        .select('id, qty_on_hand')
        .eq('part_id', partId);
      
      if (locationId) {
        stockQuery = stockQuery.eq('location_id', locationId);
      } else {
        stockQuery = stockQuery.is('location_id', null);
      }
      
      const { data: existingStock } = await stockQuery.maybeSingle();

      if (!existingStock || existingStock.qty_on_hand < quantity) {
        throw new Error('Insufficient stock');
      }

      // Update stock
      await supabase
        .from('cmms_part_stock')
        .update({ qty_on_hand: existingStock.qty_on_hand - quantity })
        .eq('id', existingStock.id);

      // Record transaction
      const { error: txError } = await supabase
        .from('cmms_part_transactions')
        .insert({
          part_id: partId,
          location_id: locationId || null,
          qty_delta: -quantity,
          reason: reason || 'Consumed',
          related_work_order_id: workOrderId || null,
          performed_by: userData.user.id,
        });

      if (txError) throw txError;

      return { partId, quantity };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-part-stock'] });
      toast.success('Part consumed');
    },
    onError: (error) => {
      toast.error('Failed to consume part: ' + error.message);
    },
  });
}
