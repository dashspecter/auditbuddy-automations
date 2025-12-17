import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export function useCmmsMetrics() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Fetch work orders
      const { data: workOrders, error: woError } = await supabase
        .from('cmms_work_orders')
        .select('id, status, priority, type, created_at, completed_at, due_at')
        .eq('company_id', companyId)
        .eq('is_archived', false);

      if (woError) throw woError;

      // Fetch assets
      const { data: assets, error: assetError } = await supabase
        .from('cmms_assets')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('is_archived', false);

      if (assetError) throw assetError;

      // Fetch parts with low stock
      const { data: parts, error: partsError } = await supabase
        .from('cmms_parts')
        .select(`
          id, name, minimum_qty,
          cmms_part_stock(qty_on_hand)
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false);

      if (partsError) throw partsError;

      // Fetch PM plans
      const { data: pmPlans, error: pmError } = await supabase
        .from('cmms_pm_plans')
        .select('id, next_due_at')
        .eq('company_id', companyId)
        .eq('is_archived', false);

      if (pmError) throw pmError;

      // Calculate metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Work order metrics
      const openWorkOrders = workOrders?.filter(wo => wo.status === 'open').length || 0;
      const inProgressWorkOrders = workOrders?.filter(wo => wo.status === 'in_progress').length || 0;
      const completedThisMonth = workOrders?.filter(wo => 
        wo.status === 'completed' && 
        wo.completed_at && 
        new Date(wo.completed_at) >= thirtyDaysAgo
      ).length || 0;
      const overdueWorkOrders = workOrders?.filter(wo => 
        wo.due_at && 
        new Date(wo.due_at) < now && 
        wo.status !== 'completed' && 
        wo.status !== 'cancelled'
      ).length || 0;

      // Priority breakdown
      const highPriorityOpen = workOrders?.filter(wo => 
        wo.priority === 'high' && 
        wo.status !== 'completed' && 
        wo.status !== 'cancelled'
      ).length || 0;

      // Type breakdown
      const reactiveCount = workOrders?.filter(wo => wo.type === 'reactive').length || 0;
      const preventiveCount = workOrders?.filter(wo => wo.type === 'preventive').length || 0;

      // Asset metrics
      const totalAssets = assets?.length || 0;
      const operationalAssets = assets?.filter(a => a.status === 'operational').length || 0;
      const downAssets = assets?.filter(a => a.status === 'down').length || 0;

      // Parts metrics - check for low stock
      const lowStockParts = parts?.filter(p => {
        const totalStock = p.cmms_part_stock?.reduce((sum: number, s: any) => sum + (s.qty_on_hand || 0), 0) || 0;
        return p.minimum_qty && totalStock <= p.minimum_qty;
      }).length || 0;

      // PM metrics
      const upcomingPMs = pmPlans?.filter(pm => 
        pm.next_due_at && 
        new Date(pm.next_due_at) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      ).length || 0;

      const overduePMs = pmPlans?.filter(pm => 
        pm.next_due_at && 
        new Date(pm.next_due_at) < now
      ).length || 0;

      return {
        workOrders: {
          open: openWorkOrders,
          inProgress: inProgressWorkOrders,
          completedThisMonth,
          overdue: overdueWorkOrders,
          highPriorityOpen,
          reactive: reactiveCount,
          preventive: preventiveCount,
        },
        assets: {
          total: totalAssets,
          operational: operationalAssets,
          down: downAssets,
        },
        parts: {
          lowStock: lowStockParts,
        },
        pm: {
          upcoming: upcomingPMs,
          overdue: overduePMs,
        },
      };
    },
    enabled: !!companyId,
  });
}

export function useRecentWorkOrders(limit = 5) {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-recent-work-orders', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cmms_work_orders')
        .select(`
          id, wo_number, title, status, priority, created_at,
          cmms_assets(name),
          locations(name)
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}
