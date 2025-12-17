import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CmmsPmPlan {
  id: string;
  company_id: string;
  name: string;
  scope_type: 'asset' | 'category' | 'tag' | 'location';
  asset_id: string | null;
  category_id: string | null;
  tag_id: string | null;
  location_id: string | null;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  frequency_value: number;
  next_due_at: string | null;
  procedure_id: string | null;
  auto_create_work_order: boolean;
  default_priority: string;
  assigned_user_id: string | null;
  assigned_team_id: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  asset?: { id: string; name: string; asset_code: string } | null;
  location?: { id: string; name: string } | null;
  procedure?: { id: string; title: string } | null;
  category?: { id: string; name: string } | null;
}

export function useCmmsPmPlans() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-pm-plans', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_pm_plans')
        .select(`
          *,
          asset:cmms_assets(id, name, asset_code),
          location:locations(id, name),
          procedure:cmms_procedures(id, title),
          category:asset_categories(id, name)
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      return data as CmmsPmPlan[];
    },
    enabled: !!companyId,
  });
}

export function useCmmsPmPlanById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-pm-plan', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('cmms_pm_plans')
        .select(`
          *,
          asset:cmms_assets(id, name, asset_code),
          location:locations(id, name),
          procedure:cmms_procedures(id, title),
          category:asset_categories(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsPmPlan;
    },
    enabled: !!id,
  });
}

export function useCreateCmmsPmPlan() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (plan: {
      name: string;
      scope_type: string;
      asset_id?: string;
      category_id?: string;
      tag_id?: string;
      location_id?: string;
      frequency_type: string;
      frequency_value?: number;
      next_due_at?: string;
      procedure_id?: string;
      auto_create_work_order?: boolean;
      default_priority?: string;
      assigned_user_id?: string;
      assigned_team_id?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      if (!companyData?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('cmms_pm_plans')
        .insert({
          ...plan,
          company_id: companyData.id,
          created_by: userData.user.id,
          frequency_value: plan.frequency_value || 1,
          auto_create_work_order: plan.auto_create_work_order ?? true,
          default_priority: plan.default_priority || 'Medium',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('cmms_audit_log').insert({
        company_id: companyData.id,
        actor_user_id: userData.user.id,
        action: 'created',
        entity_type: 'pm_plan',
        entity_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-pm-plans'] });
      toast.success('PM plan created');
    },
    onError: (error) => {
      toast.error('Failed to create PM plan: ' + error.message);
    },
  });
}

export function useUpdateCmmsPmPlan() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmmsPmPlan> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cmms_pm_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (companyData?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: companyData.id,
          actor_user_id: userData.user.id,
          action: 'updated',
          entity_type: 'pm_plan',
          entity_id: id,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-pm-plans'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-pm-plan', data.id] });
      toast.success('PM plan updated');
    },
    onError: (error) => {
      toast.error('Failed to update PM plan: ' + error.message);
    },
  });
}

export function useDeleteCmmsPmPlan() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cmms_pm_plans')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      if (companyData?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: companyData.id,
          actor_user_id: userData.user.id,
          action: 'archived',
          entity_type: 'pm_plan',
          entity_id: id,
        });
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-pm-plans'] });
      toast.success('PM plan archived');
    },
    onError: (error) => {
      toast.error('Failed to archive PM plan: ' + error.message);
    },
  });
}

// PM Runs
export function useCmmsPmRuns(pmPlanId?: string) {
  return useQuery({
    queryKey: ['cmms-pm-runs', pmPlanId],
    queryFn: async () => {
      let query = supabase
        .from('cmms_pm_runs')
        .select('*, work_order:cmms_work_orders(id, wo_number, title, status)')
        .order('run_at', { ascending: false })
        .limit(50);

      if (pmPlanId) {
        query = query.eq('pm_plan_id', pmPlanId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

// Calculate next due date based on frequency
export function calculateNextDueDate(
  currentDate: Date,
  frequencyType: string,
  frequencyValue: number = 1
): Date {
  const next = new Date(currentDate);
  
  switch (frequencyType) {
    case 'daily':
      next.setDate(next.getDate() + frequencyValue);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * frequencyValue));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + frequencyValue);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * frequencyValue));
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + frequencyValue);
      break;
  }
  
  return next;
}
