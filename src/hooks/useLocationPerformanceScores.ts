/**
 * @deprecated Use `useEmployeePerformance` directly.
 *
 * This file previously duplicated `useEmployeePerformance` under a different
 * React Query cache key ("location-performance-scores"), causing the same RPC
 * to be cached twice with no shared invalidation.
 *
 * It now re-exports `useEmployeePerformance` with identical parameters so that
 * all callers share the same cache key ("employee-performance") and invalidation.
 */
export { useEmployeePerformance as useLocationPerformanceScores } from "./useEmployeePerformance";
