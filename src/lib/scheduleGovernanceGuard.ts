/**
 * Schedule Governance Guard
 * 
 * Centralized helper functions for schedule governance enforcement.
 * These functions determine whether shift mutations should be blocked
 * and routed through the change request approval workflow.
 */

import { SchedulePeriod } from "@/hooks/useScheduleGovernance";

export interface GovernanceContext {
  isGovernanceEnabled: boolean;
  periodState: SchedulePeriod['state'] | null;
  selectedLocation: string;
}

/**
 * Determines if shifts can be mutated directly or must go through change requests.
 * 
 * Returns true if direct mutations are allowed.
 * Returns false if changes must be submitted as change requests for approval.
 */
export function canMutateShiftsDirectly(context: GovernanceContext): boolean {
  const { isGovernanceEnabled, periodState, selectedLocation } = context;
  
  // If governance is disabled, always allow direct mutations
  if (!isGovernanceEnabled) {
    return true;
  }
  
  // If no specific location selected (viewing "all"), 
  // we cannot determine period state - block mutations to be safe
  if (selectedLocation === "all") {
    return true; // Allow "all" view - individual shift actions will use their own location
  }
  
  // If period state is not locked, allow direct mutations
  if (periodState !== 'locked') {
    return true;
  }
  
  // Period is locked - must use change requests
  return false;
}

/**
 * Checks if a specific shift operation should be blocked due to governance.
 * Use this when you have the shift's location and need to check its period.
 */
export function isShiftMutationBlocked(
  isGovernanceEnabled: boolean,
  isPeriodLocked: boolean
): boolean {
  // If governance disabled, never blocked
  if (!isGovernanceEnabled) {
    return false;
  }
  
  // Blocked only if period is locked
  return isPeriodLocked;
}

/**
 * Builds a human-readable summary for a shift change request.
 */
export function buildShiftSummary(
  role: string,
  shiftDate: string,
  startTime: string,
  endTime: string
): string {
  return `${role} • ${shiftDate} • ${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
}

/**
 * Validates that governance context allows batch operations.
 * Batch operations (creating multiple shifts at once) are not supported in locked periods.
 */
export function canPerformBatchOperation(context: GovernanceContext): boolean {
  // Batch operations require direct mutation capability
  return canMutateShiftsDirectly(context);
}
