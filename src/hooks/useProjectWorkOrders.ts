import { useCmmsWorkOrders, CmmsWorkOrder, WorkOrderFilters } from '@/hooks/useCmmsWorkOrders';

/**
 * Thin wrapper: returns CMMS work orders filtered by project_id.
 * Reuses the entire useCmmsWorkOrders query — no duplicate logic.
 */
export function useProjectWorkOrders(
  projectId: string | undefined,
  extraFilters?: Omit<WorkOrderFilters, 'project_id'>
) {
  return useCmmsWorkOrders(
    projectId
      ? { ...extraFilters, project_id: projectId }
      : undefined
  );
}

export type { CmmsWorkOrder };
