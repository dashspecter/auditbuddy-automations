import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export function useWorkOrderTrends(months: number = 6) {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-wo-trends', companyId, months],
    queryFn: async () => {
      if (!companyId) return [];

      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      const endDate = endOfMonth(new Date());

      const { data, error } = await supabase
        .from('cmms_work_orders')
        .select('id, status, created_at, completed_at, type')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { created: number; completed: number; reactive: number; preventive: number }> = {};
      
      for (let i = 0; i < months; i++) {
        const month = subMonths(new Date(), months - 1 - i);
        const key = format(month, 'MMM yyyy');
        monthlyData[key] = { created: 0, completed: 0, reactive: 0, preventive: 0 };
      }

      data?.forEach(wo => {
        const createdMonth = format(new Date(wo.created_at), 'MMM yyyy');
        if (monthlyData[createdMonth]) {
          monthlyData[createdMonth].created++;
          if (wo.type === 'reactive') monthlyData[createdMonth].reactive++;
          if (wo.type === 'preventive') monthlyData[createdMonth].preventive++;
        }
        if (wo.completed_at) {
          const completedMonth = format(new Date(wo.completed_at), 'MMM yyyy');
          if (monthlyData[completedMonth]) {
            monthlyData[completedMonth].completed++;
          }
        }
      });

      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
      }));
    },
    enabled: !!companyId,
  });
}

export function useAssetHealthDistribution() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-asset-health', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cmms_assets')
        .select('status')
        .eq('company_id', companyId)
        .eq('is_archived', false);

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      data?.forEach(asset => {
        statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        count,
        fill: getStatusColor(status),
      }));
    },
    enabled: !!companyId,
  });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    operational: 'hsl(var(--chart-2))',
    needs_repair: 'hsl(var(--chart-4))',
    out_of_service: 'hsl(var(--chart-1))',
    retired: 'hsl(var(--muted))',
  };
  return colors[status] || 'hsl(var(--chart-3))';
}

export function useWorkOrdersByPriority() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-wo-priority', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cmms_work_orders')
        .select('priority, status')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .in('status', ['open', 'in_progress', 'on_hold']);

      if (error) throw error;

      const priorityCounts: Record<string, { open: number; in_progress: number; on_hold: number }> = {
        critical: { open: 0, in_progress: 0, on_hold: 0 },
        high: { open: 0, in_progress: 0, on_hold: 0 },
        medium: { open: 0, in_progress: 0, on_hold: 0 },
        low: { open: 0, in_progress: 0, on_hold: 0 },
      };

      data?.forEach(wo => {
        if (priorityCounts[wo.priority]) {
          priorityCounts[wo.priority][wo.status as keyof typeof priorityCounts.critical]++;
        }
      });

      return Object.entries(priorityCounts).map(([priority, counts]) => ({
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        ...counts,
      }));
    },
    enabled: !!companyId,
  });
}

export function usePartsUsageTrend(months: number = 6) {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-parts-usage', companyId, months],
    queryFn: async () => {
      if (!companyId) return [];

      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const { data, error } = await supabase
        .from('cmms_part_transactions')
        .select('qty_delta, created_at, part_id')
        .lt('qty_delta', 0)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const monthlyUsage: Record<string, number> = {};
      
      for (let i = 0; i < months; i++) {
        const month = subMonths(new Date(), months - 1 - i);
        const key = format(month, 'MMM yyyy');
        monthlyUsage[key] = 0;
      }

      data?.forEach(tx => {
        const month = format(new Date(tx.created_at), 'MMM yyyy');
        if (monthlyUsage[month] !== undefined) {
          monthlyUsage[month] += Math.abs(tx.qty_delta);
        }
      });

      return Object.entries(monthlyUsage).map(([month, usage]) => ({
        month,
        usage,
      }));
    },
    enabled: !!companyId,
  });
}

export function useCompletionTimeStats() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-completion-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('cmms_work_orders')
        .select('created_at, completed_at, priority')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { avgHours: 0, byPriority: {} };
      }

      const completionTimes = data.map(wo => {
        const created = new Date(wo.created_at).getTime();
        const completed = new Date(wo.completed_at!).getTime();
        return {
          hours: (completed - created) / (1000 * 60 * 60),
          priority: wo.priority,
        };
      });

      const avgHours = completionTimes.reduce((sum, t) => sum + t.hours, 0) / completionTimes.length;

      const byPriority: Record<string, number> = {};
      const priorityCounts: Record<string, number[]> = {};
      
      completionTimes.forEach(t => {
        if (!priorityCounts[t.priority]) priorityCounts[t.priority] = [];
        priorityCounts[t.priority].push(t.hours);
      });

      Object.entries(priorityCounts).forEach(([priority, times]) => {
        byPriority[priority] = times.reduce((sum, t) => sum + t, 0) / times.length;
      });

      return { avgHours: Math.round(avgHours * 10) / 10, byPriority };
    },
    enabled: !!companyId,
  });
}
