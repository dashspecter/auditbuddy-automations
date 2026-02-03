/**
 * COMPLETION IDENTITY HELPERS
 * 
 * Centralized, pure functions for task completion identity resolution.
 * Used by Mobile, Kiosk, and Web to ensure consistent completion matching.
 * 
 * ALL completion reads and writes MUST use these helpers to ensure:
 * 1. Virtual/occurrence IDs are normalized to base task IDs
 * 2. Occurrence dates are extracted consistently
 * 3. Completion keys match across all surfaces
 */

/**
 * UUID pattern (standard 8-4-4-4-12 format)
 */
const UUID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * Date suffix patterns for virtual/completed IDs
 * Matches: -virtual-YYYY-MM-DD or -completed-YYYY-MM-DD
 */
const OCCURRENCE_DATE_PATTERN = /-(?:virtual|completed)-(\d{4}-\d{2}-\d{2})/;

/**
 * Extract the base (original) task ID from a potentially virtual/occurrence ID.
 * 
 * Examples:
 * - "abc123-virtual-2026-01-08" → "abc123"
 * - "abc123-completed-2026-01-08" → "abc123"
 * - "abc123" → "abc123" (unchanged)
 * 
 * @param taskId The task ID (may be virtual/occurrence format)
 * @returns The base task UUID
 */
export function getBaseTaskId(taskId: string): string {
  if (!taskId) return taskId;
  
  // Extract UUID from the beginning of the string
  const match = taskId.match(UUID_PATTERN);
  if (match) {
    return match[1];
  }
  
  // Fallback: return as-is (shouldn't happen for valid task IDs)
  return taskId;
}

/**
 * Extract the occurrence date from a virtual/completed ID.
 * 
 * Examples:
 * - "abc123-virtual-2026-01-08" → "2026-01-08"
 * - "abc123-completed-2026-01-08" → "2026-01-08"
 * - "abc123" → fallbackDayKey
 * 
 * @param taskId The task ID (may be virtual/occurrence format)
 * @param fallbackDayKey The day key to use if no date is found in the ID
 * @returns The occurrence date in YYYY-MM-DD format
 */
export function getOccurrenceDate(taskId: string, fallbackDayKey: string): string {
  if (!taskId) return fallbackDayKey;
  
  const match = taskId.match(OCCURRENCE_DATE_PATTERN);
  if (match) {
    return match[1];
  }
  
  return fallbackDayKey;
}

/**
 * Create a completion key from a task ID and fallback day key.
 * This is the canonical format for matching completions to tasks.
 * 
 * @param taskId The task ID (may be virtual/occurrence format)
 * @param fallbackDayKey The day key to use if no date is found in the ID
 * @returns Object containing baseTaskId, occurrenceDate, and the composite key
 */
export function makeCompletionKey(
  taskId: string,
  fallbackDayKey: string
): {
  baseTaskId: string;
  occurrenceDate: string;
  key: string;
} {
  const baseTaskId = getBaseTaskId(taskId);
  const occurrenceDate = getOccurrenceDate(taskId, fallbackDayKey);
  const key = `${baseTaskId}:${occurrenceDate}`;
  
  return { baseTaskId, occurrenceDate, key };
}

/**
 * Check if a task ID is a virtual/occurrence ID (not a base ID).
 * 
 * @param taskId The task ID to check
 * @returns true if the ID contains virtual/completed suffix
 */
export function isVirtualOrOccurrenceId(taskId: string): boolean {
  if (!taskId) return false;
  return taskId.includes("-virtual-") || taskId.includes("-completed-");
}

/**
 * Build a completions lookup map from completion records.
 * 
 * @param completions Array of completion records with task_id and occurrence_date
 * @returns Map with key format "baseTaskId:occurrenceDate"
 */
export function buildCompletionsMap<T extends { task_id: string; occurrence_date: string }>(
  completions: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const c of completions) {
    // Normalize task_id in case it somehow has a suffix (defensive)
    const baseId = getBaseTaskId(c.task_id);
    const key = `${baseId}:${c.occurrence_date}`;
    map.set(key, c);
  }
  return map;
}
