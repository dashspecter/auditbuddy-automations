import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export interface AssetBusyWindow {
  work_order_id: string;
  wo_number: number;
  title: string;
  project_id: string | null;
  project_title: string | null;
  project_number: string | null;
  status: string;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
}

export interface AssetReservationWindow {
  reservation_id: string;
  project_id: string | null;
  project_title: string | null;
  project_number: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

export interface AssetAvailability {
  asset_id: string;
  asset_name: string;
  asset_code: string;
  asset_status: string;
  location_id: string | null;
  location_name: string | null;
  busy_windows: AssetBusyWindow[];
  reservation_windows: AssetReservationWindow[];
  /** true if there's any active/in-progress WO right now */
  is_busy_now: boolean;
  /** true if there is a confirmed reservation overlapping today */
  has_reservation: boolean;
  /** ISO string of when the current WO is due (if busy) */
  free_at: string | null;
}

/**
 * Derives per-asset availability from cmms_assets + cmms_work_orders + gov_asset_reservations.
 *
 * @param daysAhead how many days ahead to look for reservations (default: 14)
 */
export function useFleetAvailability(daysAhead = 14) {
  const { data: company } = useCompany();
  const now = new Date();

  return useQuery({
    queryKey: ['fleet-availability', company?.id, daysAhead],
    queryFn: async () => {
      if (!company?.id) return [];

      // Fetch all assets
      const { data: assets, error: assetsError } = await supabase
        .from('cmms_assets')
        .select('id, name, asset_code, status, location_id, location:locations(id, name)')
        .eq('company_id', company.id)
        .eq('is_archived', false)
        .order('name');

      if (assetsError) throw assetsError;
      if (!assets?.length) return [];

      const assetIds = assets.map((a: any) => a.id);
      const today = now.toISOString().slice(0, 10);
      const windowEnd = new Date(now.getTime() + daysAhead * 86_400_000).toISOString().slice(0, 10);

      // Fetch active WOs with asset assigned (not done/cancelled)
      const [{ data: workOrders, error: woError }, { data: reservations, error: resError }] =
        await Promise.all([
          supabase
            .from('cmms_work_orders')
            .select('id, wo_number, title, status, asset_id, project_id, started_at, due_at, completed_at')
            .eq('company_id', company.id)
            .in('asset_id', assetIds)
            .not('status', 'in', '("Done","Cancelled")')
            .order('due_at', { ascending: true }),

          supabase
            .from('gov_asset_reservations' as any)
            .select('id, asset_id, project_id, start_date, end_date, status')
            .eq('company_id', company.id)
            .in('asset_id', assetIds)
            .neq('status', 'cancelled')
            .lte('start_date', windowEnd)
            .gte('end_date', today),
        ]);

      if (woError) throw woError;
      if (resError) throw resError;

      // Collect all project IDs from WOs + reservations
      const woProjectIds = (workOrders || []).map((w: any) => w.project_id).filter(Boolean);
      const resProjectIds = (reservations || []).map((r: any) => r.project_id).filter(Boolean);
      const allProjectIds = [...new Set([...woProjectIds, ...resProjectIds])];
      const projectMap: Record<string, { title: string; project_number: string }> = {};

      if (allProjectIds.length > 0) {
        const { data: projects } = await supabase
          .from('gov_projects' as any)
          .select('id, title, project_number')
          .in('id', allProjectIds);
        for (const p of projects || []) {
          projectMap[p.id] = { title: p.title, project_number: p.project_number };
        }
      }

      return assets.map((asset: any): AssetAvailability => {
        const assetWOs: AssetBusyWindow[] = (workOrders || [])
          .filter((w: any) => w.asset_id === asset.id)
          .map((w: any) => ({
            work_order_id: w.id,
            wo_number: w.wo_number,
            title: w.title,
            project_id: w.project_id,
            project_title: w.project_id ? (projectMap[w.project_id]?.title ?? null) : null,
            project_number: w.project_id ? (projectMap[w.project_id]?.project_number ?? null) : null,
            status: w.status,
            started_at: w.started_at,
            due_at: w.due_at,
            completed_at: w.completed_at,
          }));

        const assetReservations: AssetReservationWindow[] = (reservations || [])
          .filter((r: any) => r.asset_id === asset.id)
          .map((r: any) => ({
            reservation_id: r.id,
            project_id: r.project_id,
            project_title: r.project_id ? (projectMap[r.project_id]?.title ?? null) : null,
            project_number: r.project_id ? (projectMap[r.project_id]?.project_number ?? null) : null,
            start_date: r.start_date,
            end_date: r.end_date,
            status: r.status,
          }));

        const activeWO = assetWOs.find(w => w.status === 'InProgress');
        const isBusyNow = !!activeWO;
        const hasReservation = assetReservations.some(
          r => r.start_date <= today && r.end_date >= today
        );

        return {
          asset_id: asset.id,
          asset_name: asset.name,
          asset_code: asset.asset_code,
          asset_status: asset.status,
          location_id: asset.location_id,
          location_name: asset.location?.name ?? null,
          busy_windows: assetWOs,
          reservation_windows: assetReservations,
          is_busy_now: isBusyNow,
          has_reservation: hasReservation,
          free_at: activeWO?.due_at ?? null,
        };
      });
    },
    enabled: !!company?.id,
    staleTime: 2 * 60 * 1000,
  });
}
