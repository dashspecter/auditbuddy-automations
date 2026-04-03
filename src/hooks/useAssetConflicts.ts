import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export type ConflictSource = 'reservation' | 'work_order';

export interface AssetConflict {
  source: ConflictSource;
  /** reservation id or work order id */
  id: string;
  title: string;
  project_title: string | null;
  project_number: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * Checks for scheduling conflicts for a given asset over a date range.
 * Queries both gov_asset_reservations and cmms_work_orders (via due_at).
 *
 * Returns all overlapping reservations/WOs so the UI can surface them before
 * the user saves a new reservation.
 *
 * @param assetId  - the asset to check
 * @param startDate - ISO date string "YYYY-MM-DD"
 * @param endDate   - ISO date string "YYYY-MM-DD"
 * @param excludeReservationId - omit this reservation id (for edit flows)
 */
export function useAssetConflicts(
  assetId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  excludeReservationId?: string
) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['asset-conflicts', assetId, startDate, endDate, excludeReservationId],
    queryFn: async (): Promise<AssetConflict[]> => {
      if (!assetId || !startDate || !endDate || !company?.id) return [];

      const conflicts: AssetConflict[] = [];

      // ── 1. Overlapping reservations ──────────────────────────────────────
      // Overlap condition: existing.start_date <= new.end_date AND existing.end_date >= new.start_date
      let resQuery = (supabase as any)
        .from('gov_asset_reservations')
        .select(`
          id, start_date, end_date, status, notes,
          project:gov_projects(id, title, project_number)
        `)
        .eq('company_id', company.id)
        .eq('asset_id', assetId)
        .neq('status', 'cancelled')
        .lte('start_date', endDate)
        .gte('end_date', startDate);

      if (excludeReservationId) {
        resQuery = resQuery.neq('id', excludeReservationId);
      }

      const { data: reservations } = await resQuery;

      for (const r of reservations ?? []) {
        conflicts.push({
          source: 'reservation',
          id: r.id,
          title: `Reserved ${r.start_date} – ${r.end_date}`,
          project_title: (r.project as any)?.title ?? null,
          project_number: (r.project as any)?.project_number ?? null,
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status,
        });
      }

      // ── 2. Overlapping work orders ────────────────────────────────────────
      // WOs don't have a start_date, so we use: due_at falls within the window,
      // OR status is InProgress/Open (open-ended — considered ongoing).
      // We treat a WO as conflicting if:
      //   - it's not Done/Cancelled
      //   - its due_at is within [startDate, endDate], OR it's InProgress (no end known)
      const { data: workOrders } = await supabase
        .from('cmms_work_orders')
        .select(`
          id, wo_number, title, status, due_at, started_at,
          project_id
        `)
        .eq('company_id', company.id)
        .eq('asset_id', assetId)
        .not('status', 'in', '("Done","Cancelled")');

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      const projectIds = [...new Set((workOrders ?? []).map((w: any) => w.project_id).filter(Boolean))];
      const projectMap: Record<string, { title: string; project_number: string }> = {};

      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('gov_projects')
          .select('id, title, project_number')
          .in('id', projectIds);
        for (const p of projects ?? []) {
          projectMap[p.id] = { title: p.title, project_number: p.project_number };
        }
      }

      for (const wo of workOrders ?? []) {
        const dueAt = wo.due_at ? new Date(wo.due_at) : null;
        const startedAt = wo.started_at ? new Date(wo.started_at) : null;

        // Conflict if: InProgress (actively running), OR due_at falls within window,
        // OR started_at is within window
        const isActivelyRunning = wo.status === 'InProgress';
        const dueWithin = dueAt && dueAt >= start && dueAt <= end;
        const startedWithin = startedAt && startedAt >= start && startedAt <= end;

        if (isActivelyRunning || dueWithin || startedWithin) {
          const proj = wo.project_id ? projectMap[wo.project_id] : null;
          conflicts.push({
            source: 'work_order',
            id: wo.id,
            title: `WO-${wo.wo_number}: ${wo.title}`,
            project_title: proj?.title ?? null,
            project_number: proj?.project_number ?? null,
            start_date: wo.started_at ? wo.started_at.slice(0, 10) : startDate,
            end_date: wo.due_at ? wo.due_at.slice(0, 10) : endDate,
            status: wo.status,
          });
        }
      }

      return conflicts;
    },
    enabled: !!assetId && !!startDate && !!endDate && !!company?.id,
    staleTime: 30_000,
  });
}
