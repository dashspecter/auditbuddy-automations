import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CmmsPurchaseOrder {
  id: string;
  company_id: string;
  po_number: number;
  vendor_id: string | null;
  location_id: string | null;
  status: 'Draft' | 'Submitted' | 'Partial' | 'Received' | 'Cancelled';
  expected_at: string | null;
  notes: string | null;
  total_cost: number | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  vendor?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
}

export interface CmmsPurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  part_id: string;
  qty: number;
  unit_cost: number;
  received_qty: number | null;
  created_at: string;
  part?: { id: string; name: string; sku: string | null } | null;
}

export function useCmmsPurchaseOrders() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-purchase-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_purchase_orders')
        .select(`
          *,
          vendor:cmms_vendors(id, name),
          location:locations(id, name)
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CmmsPurchaseOrder[];
    },
    enabled: !!companyId,
  });
}

export function useCmmsPurchaseOrderById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-purchase-order', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('cmms_purchase_orders')
        .select(`
          *,
          vendor:cmms_vendors(id, name),
          location:locations(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsPurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCmmsPurchaseOrderItems(poId: string | undefined) {
  return useQuery({
    queryKey: ['cmms-po-items', poId],
    queryFn: async () => {
      if (!poId) return [];
      
      const { data, error } = await supabase
        .from('cmms_purchase_order_items')
        .select('*, part:cmms_parts(id, name, sku)')
        .eq('purchase_order_id', poId);

      if (error) throw error;
      return data as CmmsPurchaseOrderItem[];
    },
    enabled: !!poId,
  });
}

export function useCreateCmmsPurchaseOrder() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (po: {
      vendor_id?: string;
      location_id?: string;
      expected_at?: string;
      notes?: string;
      items: Array<{ part_id: string; qty: number; unit_cost: number }>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      if (!companyData?.id) throw new Error('No company');

      const totalCost = po.items.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0);

      const { data, error } = await supabase
        .from('cmms_purchase_orders')
        .insert({
          company_id: companyData.id,
          vendor_id: po.vendor_id || null,
          location_id: po.location_id || null,
          expected_at: po.expected_at || null,
          notes: po.notes || null,
          total_cost: totalCost,
          status: 'Draft',
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add items
      if (po.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('cmms_purchase_order_items')
          .insert(
            po.items.map(item => ({
              purchase_order_id: data.id,
              part_id: item.part_id,
              qty: item.qty,
              unit_cost: item.unit_cost,
            }))
          );
        if (itemsError) throw itemsError;
      }

      await supabase.from('cmms_audit_log').insert({
        company_id: companyData.id,
        actor_user_id: userData.user.id,
        action: 'created',
        entity_type: 'purchase_order',
        entity_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-purchase-orders'] });
      toast.success('Purchase order created');
    },
    onError: (error) => {
      toast.error('Failed to create PO: ' + error.message);
    },
  });
}

export function useUpdateCmmsPurchaseOrderStatus() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cmms_purchase_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (companyData?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: companyData.id,
          actor_user_id: userData.user.id,
          action: 'status_changed',
          entity_type: 'purchase_order',
          entity_id: id,
          metadata_json: { new_status: status },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-purchase-order', data.id] });
      toast.success('PO status updated');
    },
    onError: (error) => {
      toast.error('Failed to update PO: ' + error.message);
    },
  });
}

export function useReceivePurchaseOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poId,
      locationId,
      items,
    }: {
      poId: string;
      locationId?: string;
      items: Array<{ itemId: string; partId: string; receivedQty: number }>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      for (const item of items) {
        // Update received qty
        const { data: poItem } = await supabase
          .from('cmms_purchase_order_items')
          .select('received_qty')
          .eq('id', item.itemId)
          .single();

        await supabase
          .from('cmms_purchase_order_items')
          .update({ received_qty: (poItem?.received_qty || 0) + item.receivedQty })
          .eq('id', item.itemId);

        // Update stock
        let stockQuery = supabase
          .from('cmms_part_stock')
          .select('id, qty_on_hand')
          .eq('part_id', item.partId);
        
        if (locationId) {
          stockQuery = stockQuery.eq('location_id', locationId);
        } else {
          stockQuery = stockQuery.is('location_id', null);
        }
        
        const { data: existingStock } = await stockQuery.maybeSingle();

        if (existingStock) {
          await supabase
            .from('cmms_part_stock')
            .update({ qty_on_hand: existingStock.qty_on_hand + item.receivedQty })
            .eq('id', existingStock.id);
        } else {
          await supabase
            .from('cmms_part_stock')
            .insert({
              part_id: item.partId,
              location_id: locationId || null,
              qty_on_hand: item.receivedQty,
            });
        }

        // Record transaction
        await supabase.from('cmms_part_transactions').insert({
          part_id: item.partId,
          location_id: locationId || null,
          qty_delta: item.receivedQty,
          reason: `Received from PO`,
          performed_by: userData.user.id,
        });
      }

      return { poId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-purchase-order', data.poId] });
      queryClient.invalidateQueries({ queryKey: ['cmms-po-items', data.poId] });
      queryClient.invalidateQueries({ queryKey: ['cmms-part-stock'] });
      toast.success('Items received');
    },
    onError: (error) => {
      toast.error('Failed to receive items: ' + error.message);
    },
  });
}
