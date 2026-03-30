/**
 * @deprecated All exports from this file have been removed.
 *
 * This file previously implemented a SEPARATE effective score calculation for
 * the kiosk with different punctuality logic (late_count > 0 instead of
 * shifts_scheduled > 0) and NO warning penalty. This caused the same employee
 * to show a different score in the kiosk vs their profile.
 *
 * USE INSTEAD:
 *   import { computeEffectiveScore, computeEffectiveScores } from "@/lib/effectiveScore";
 *
 * effectiveScore.ts is the SINGLE source of truth for all employee score
 * calculations across the entire platform.
 */

// Re-export from canonical source so any missed import sites still compile.
export {
  computeEffectiveScore as computeKioskEffectiveScore,
  computeEffectiveScores as computeKioskLeaderboardScores,
  type EffectiveEmployeeScore as KioskEmployeeScore,
} from "@/lib/effectiveScore";
