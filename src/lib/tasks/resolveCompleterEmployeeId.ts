/**
 * COMPLETER ATTRIBUTION RESOLVER
 * 
 * Provides resilient attribution of task completions to scheduled employees.
 * Handles:
 * - Direct employee IDs (from task_completions)
 * - Auth user IDs (from legacy completed_by fields)
 * - Profile IDs (from legacy systems)
 * - Direct assignment fallback (for individually assigned tasks only)
 */

/**
 * Build a map from auth user/profile IDs to employee IDs for scheduled team members.
 * Used to convert legacy completion fields to employee IDs for Champions attribution.
 */
export function buildUserToEmployeeIdMap(todaysTeam: Array<{
  id: string;
  user_id?: string | null;
  auth_user_id?: string | null;
  profile_id?: string | null;
}>): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of todaysTeam) {
    // Try all possible user/profile ID fields
    const userId = e.user_id ?? (e as any).auth_user_id ?? (e as any).profile_id;
    if (userId) {
      map.set(userId, e.id);
    }
  }
  return map;
}

/**
 * Resolve the employee ID of the person who completed a task.
 * 
 * Attempts to find a valid scheduled employee ID using multiple fallbacks:
 * 1. completed_by_employee_id (preferred, from task_completions)
 * 2. completed_by (string) - might be employee ID or user ID
 * 3. completed_by.id (object shape from some legacy systems)
 * 4. completed_by_user_id / completed_by_profile_id (legacy fields)
 * 5. assigned_to (ONLY for direct-assignment tasks, not role/location-based)
 * 
 * @param task The task object with completion metadata
 * @param scheduledEmployeeIds Set of employee IDs scheduled for today
 * @param userToEmployeeIdMap Map from user/profile IDs to employee IDs
 * @returns The employee ID if attributable, null otherwise
 */
export function resolveCompleterEmployeeId(
  task: any,
  scheduledEmployeeIds: Set<string>,
  userToEmployeeIdMap: Map<string, string>
): string | null {
  // Extract raw completer value from all possible fields
  const rawFromCompletedBy = task.completed_by;
  const rawFromCompletedByObject = 
    typeof rawFromCompletedBy === 'object' && rawFromCompletedBy !== null
      ? rawFromCompletedBy.id
      : null;
  
  const raw =
    task.completed_by_employee_id ??
    (typeof rawFromCompletedBy === 'string' ? rawFromCompletedBy : null) ??
    rawFromCompletedByObject ??
    task.completed_by_user_id ??
    task.completed_by_profile_id ??
    null;

  if (!raw) {
    // SAFE fallback: only for DIRECT assignment tasks (not role/location-based)
    // Direct assignment means assigned_to is set AND no role assignment
    const isDirectAssignment = 
      task.assigned_to && 
      !task.assigned_role_id && 
      !task.assigned_role;
    
    if (isDirectAssignment && scheduledEmployeeIds.has(task.assigned_to)) {
      return task.assigned_to;
    }
    return null;
  }

  // Case 1: raw is already a scheduled employee ID
  if (scheduledEmployeeIds.has(raw)) {
    return raw;
  }

  // Case 2: raw is a user/profile ID -> map it to employee ID
  const mapped = userToEmployeeIdMap.get(raw);
  if (mapped && scheduledEmployeeIds.has(mapped)) {
    return mapped;
  }

  // SAFE fallback: direct assignment only
  const isDirectAssignment = 
    task.assigned_to && 
    !task.assigned_role_id && 
    !task.assigned_role;
  
  if (isDirectAssignment && scheduledEmployeeIds.has(task.assigned_to)) {
    return task.assigned_to;
  }

  return null;
}

/**
 * Debug helper: returns detailed attribution info for a task.
 * Useful for diagnosing why Champions attribution is failing.
 */
export function getAttributionDebugInfo(
  task: any,
  scheduledEmployeeIds: Set<string>,
  userToEmployeeIdMap: Map<string, string>
): {
  rawCompleter: string | null;
  resolvedEmployeeId: string | null;
  assignedTo: string | null;
  isDirectAssignment: boolean;
  mappedFromUserId: boolean;
} {
  const rawFromCompletedBy = task.completed_by;
  const rawFromCompletedByObject = 
    typeof rawFromCompletedBy === 'object' && rawFromCompletedBy !== null
      ? rawFromCompletedBy.id
      : null;
  
  const raw =
    task.completed_by_employee_id ??
    (typeof rawFromCompletedBy === 'string' ? rawFromCompletedBy : null) ??
    rawFromCompletedByObject ??
    task.completed_by_user_id ??
    task.completed_by_profile_id ??
    null;

  const isDirectAssignment = 
    task.assigned_to && 
    !task.assigned_role_id && 
    !task.assigned_role;

  let resolved: string | null = null;
  let mappedFromUserId = false;

  if (raw) {
    if (scheduledEmployeeIds.has(raw)) {
      resolved = raw;
    } else {
      const mapped = userToEmployeeIdMap.get(raw);
      if (mapped && scheduledEmployeeIds.has(mapped)) {
        resolved = mapped;
        mappedFromUserId = true;
      }
    }
  }

  if (!resolved && isDirectAssignment && scheduledEmployeeIds.has(task.assigned_to)) {
    resolved = task.assigned_to;
  }

  return {
    rawCompleter: raw,
    resolvedEmployeeId: resolved,
    assignedTo: task.assigned_to ?? null,
    isDirectAssignment,
    mappedFromUserId,
  };
}
