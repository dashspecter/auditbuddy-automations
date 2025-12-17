import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CmmsWorkOrder {
  id: string;
  company_id: string;
  wo_number: number;
  title: string;
  type: 'Reactive' | 'Preventive' | 'Inspection' | 'Calibration';
  asset_id: string | null;
  location_id: string | null;
  status: 'Open' | 'OnHold' | 'InProgress' | 'Done' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_user_id: string | null;
  assigned_team_id: string | null;
  description: string | null;
  internal_notes: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  procedure_id: string | null;
  checklist_snapshot_json: any;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_archived: boolean;
  // Joined data
  asset?: {
    id: string;
    name: string;
    asset_code: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  procedure?: {
    id: string;
    title: string;
  } | null;
}

export interface WorkOrderFilters {
  status?: string[];
  priority?: string[];
  type?: string[];
  location_id?: string;
  asset_id?: string;
  assigned_user_id?: string;
  due_from?: string;
  due_to?: string;
  search?: string;
}

export function useCmmsWorkOrders(filters?: WorkOrderFilters) {
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useQuery({
    queryKey: ['cmms-work-orders', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('cmms_work_orders')
        .select(`
          *,
          asset:cmms_assets(id, name, asset_code),
          location:locations(id, name),
          procedure:cmms_procedures(id, title)
        `)
        .eq('company_id', company.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.type?.length) {
        query = query.in('type', filters.type);
      }
      if (filters?.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      if (filters?.asset_id) {
        query = query.eq('asset_id', filters.asset_id);
      }
      if (filters?.assigned_user_id) {
        query = query.eq('assigned_user_id', filters.assigned_user_id);
      }
      if (filters?.due_from) {
        query = query.gte('due_at', filters.due_from);
      }
      if (filters?.due_to) {
        query = query.lte('due_at', filters.due_to);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CmmsWorkOrder[];
    },
    enabled: !!company?.id,
  });
}

export function useCmmsWorkOrderById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-work-order', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('cmms_work_orders')
        .select(`
          *,
          asset:cmms_assets(id, name, asset_code, location_id),
          location:locations(id, name),
          procedure:cmms_procedures(id, title, estimated_minutes, safety_notes)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsWorkOrder;
    },
    enabled: !!id,
  });
}

export function useCreateCmmsWorkOrder() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async (data: Partial<CmmsWorkOrder>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !company?.id) throw new Error('Not authenticated');

      const insertData = {
        title: data.title || '',
        company_id: company.id,
        created_by: userData.user.id,
        type: data.type || 'Reactive',
        status: data.status || 'Open',
        priority: data.priority || 'Medium',
        asset_id: data.asset_id,
        location_id: data.location_id,
        description: data.description,
        due_at: data.due_at,
        assigned_user_id: data.assigned_user_id,
        procedure_id: data.procedure_id,
      };

      const { data: result, error } = await supabase
        .from('cmms_work_orders')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('cmms_audit_log').insert({
        company_id: company.id,
        actor_user_id: userData.user.id,
        action: 'create',
        entity_type: 'work_order',
        entity_id: result.id,
        metadata_json: { title: data.title },
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-work-orders'] });
      toast.success('Work order created');
    },
    onError: (error) => {
      toast.error('Failed to create work order: ' + error.message);
    },
  });
}

export function useUpdateCmmsWorkOrder() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CmmsWorkOrder> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('cmms_work_orders')
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
          entity_type: 'work_order',
          entity_id: id,
          metadata_json: data,
        });
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-work-order', variables.id] });
    },
    onError: (error) => {
      toast.error('Failed to update work order: ' + error.message);
    },
  });
}

export function useUpdateCmmsWorkOrderStatus() {
  const queryClient = useQueryClient();
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return useMutation({
    mutationFn: async ({ id, status, fromStatus }: { id: string; status: string; fromStatus: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !company?.id) throw new Error('Not authenticated');

      const updates: any = { status };
      if (status === 'InProgress' && fromStatus === 'Open') {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'Done') {
        updates.completed_at = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from('cmms_work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log status history
      await supabase.from('cmms_work_order_status_history').insert({
        work_order_id: id,
        from_status: fromStatus,
        to_status: status,
        changed_by: userData.user.id,
      });

      // Log to audit
      await supabase.from('cmms_audit_log').insert({
        company_id: company.id,
        actor_user_id: userData.user.id,
        action: 'status_change',
        entity_type: 'work_order',
        entity_id: id,
        metadata_json: { from_status: fromStatus, to_status: status },
      });

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-work-order', variables.id] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

// Work Order Comments
export function useCmmsWorkOrderComments(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['cmms-work-order-comments', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];

      const { data, error } = await supabase
        .from('cmms_work_order_comments')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });
}

export function useAddCmmsWorkOrderComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, comment }: { workOrderId: string; comment: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cmms_work_order_comments')
        .insert({
          work_order_id: workOrderId,
          user_id: userData.user.id,
          comment_text: comment,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-work-order-comments', variables.workOrderId] });
      toast.success('Comment added');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    },
  });
}

// Checklist Responses
export function useCmmsChecklistResponses(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['cmms-checklist-responses', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];

      const { data, error } = await supabase
        .from('cmms_work_order_checklist_responses')
        .select('*')
        .eq('work_order_id', workOrderId);

      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });
}

export function useUpdateCmmsChecklistResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, stepKey, response, photoUrl }: { 
      workOrderId: string; 
      stepKey: string; 
      response: any;
      photoUrl?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cmms_work_order_checklist_responses')
        .upsert({
          work_order_id: workOrderId,
          step_key: stepKey,
          response_json: response,
          photo_url: photoUrl,
          completed_at: response?.completed ? new Date().toISOString() : null,
          completed_by: response?.completed ? userData.user.id : null,
        }, { onConflict: 'work_order_id,step_key' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-checklist-responses', variables.workOrderId] });
    },
  });
}
