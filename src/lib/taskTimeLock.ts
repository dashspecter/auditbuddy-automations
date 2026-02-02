/**
 * TASK TIME-LOCK HELPER
 * 
 * Determines whether a task can be completed based on its scheduled time
 * and configured unlock window.
 * 
 * Rules:
 * - lock_mode='anytime': Task can be completed anytime
 * - lock_mode='scheduled': Task can only be completed within unlock window
 * - Default unlock window: 30 minutes before start_at
 * - Tasks without start_at are always completable
 */

import { Task } from "@/hooks/useTasks";
import { format, addMinutes, subMinutes, isBefore, isAfter, differenceInMinutes } from "date-fns";

// =============================================================
// TYPES
// =============================================================

export type LockMode = "anytime" | "scheduled";

export interface TimeLockStatus {
  /** Whether the task can be completed right now */
  canComplete: boolean;
  /** Whether early completion is allowed (with reason/photo) */
  allowEarlyWithReason: boolean;
  /** Whether a reason is required for early completion */
  requiresReason: boolean;
  /** Whether a photo is required for early completion */
  requiresPhoto: boolean;
  /** If locked, when does it unlock? */
  unlockAt: Date | null;
  /** Formatted unlock time for display */
  unlockAtFormatted: string | null;
  /** Minutes until unlock (negative if unlocked) */
  minutesUntilUnlock: number;
  /** Is this task currently early (before scheduled time)? */
  isEarly: boolean;
  /** Is this task currently late (after deadline)? */
  isLate: boolean;
  /** The reason why task is locked */
  lockReason: "not_locked" | "too_early" | "no_schedule";
  /** i18n message key for UI */
  messageKey: string;
}

export interface TimeLockConfig {
  /** Minutes before start_at when task becomes completable (default: 30) */
  unlockBeforeMinutes: number;
  /** Lock mode: anytime or scheduled */
  lockMode: LockMode;
  /** Allow early completion with reason/photo */
  allowEarlyCompletion: boolean;
  /** Require reason for early completion */
  earlyRequiresReason: boolean;
  /** Require photo for early completion */
  earlyRequiresPhoto: boolean;
}

// Default configuration
const DEFAULT_CONFIG: TimeLockConfig = {
  unlockBeforeMinutes: 30,
  lockMode: "scheduled",
  allowEarlyCompletion: false,
  earlyRequiresReason: false,
  earlyRequiresPhoto: false,
};

// =============================================================
// HELPERS
// =============================================================

/**
 * Extract time-lock config from a task
 * Falls back to defaults for fields not present in DB
 */
export function getTaskTimeLockConfig(task: Task): TimeLockConfig {
  // These fields may or may not exist on the task - use type assertion
  const taskAny = task as any;
  
  return {
    unlockBeforeMinutes: taskAny.unlock_before_minutes ?? DEFAULT_CONFIG.unlockBeforeMinutes,
    lockMode: (taskAny.lock_mode as LockMode) ?? DEFAULT_CONFIG.lockMode,
    allowEarlyCompletion: taskAny.allow_early_completion ?? DEFAULT_CONFIG.allowEarlyCompletion,
    earlyRequiresReason: taskAny.early_requires_reason ?? DEFAULT_CONFIG.earlyRequiresReason,
    earlyRequiresPhoto: taskAny.early_requires_photo ?? DEFAULT_CONFIG.earlyRequiresPhoto,
  };
}

/**
 * Get the scheduled datetime for a task occurrence
 * For recurring tasks, this should be computed per-occurrence
 */
export function getTaskScheduledTime(task: Task): Date | null {
  if (task.start_at) {
    return new Date(task.start_at);
  }
  return null;
}

/**
 * Get the deadline for a task
 */
export function getTaskDeadline(task: Task): Date | null {
  if (task.start_at && task.duration_minutes) {
    return addMinutes(new Date(task.start_at), task.duration_minutes);
  }
  if (task.due_at) {
    return new Date(task.due_at);
  }
  return null;
}

// =============================================================
// MAIN FUNCTION
// =============================================================

/**
 * Compute the time-lock status for a task
 * 
 * @param task The task to check
 * @param now Current time (default: now)
 * @returns TimeLockStatus indicating whether task can be completed
 */
export function getTimeLockStatus(task: Task, now: Date = new Date()): TimeLockStatus {
  const config = getTaskTimeLockConfig(task);
  const scheduledTime = getTaskScheduledTime(task);
  const deadline = getTaskDeadline(task);
  
  // Default unlocked state
  const unlocked: TimeLockStatus = {
    canComplete: true,
    allowEarlyWithReason: false,
    requiresReason: false,
    requiresPhoto: false,
    unlockAt: null,
    unlockAtFormatted: null,
    minutesUntilUnlock: 0,
    isEarly: false,
    isLate: false,
    lockReason: "not_locked",
    messageKey: "tasks.timeLock.available",
  };
  
  // Always-on mode or execution_mode=always_on: no locking
  const executionMode = (task as any).execution_mode;
  if (config.lockMode === "anytime" || executionMode === "always_on") {
    return unlocked;
  }
  
  // No scheduled time = no locking
  if (!scheduledTime) {
    return {
      ...unlocked,
      lockReason: "no_schedule",
    };
  }
  
  // Compute unlock time (start_at - unlock_before_minutes)
  const unlockAt = subMinutes(scheduledTime, config.unlockBeforeMinutes);
  const minutesUntilUnlock = differenceInMinutes(unlockAt, now);
  
  // Check if past deadline (late)
  const isLate = deadline ? isAfter(now, deadline) : false;
  
  // Check if before unlock time (early)
  const isEarly = isBefore(now, unlockAt);
  
  // If early and not allowed
  if (isEarly && !config.allowEarlyCompletion) {
    return {
      canComplete: false,
      allowEarlyWithReason: false,
      requiresReason: false,
      requiresPhoto: false,
      unlockAt,
      unlockAtFormatted: format(unlockAt, "HH:mm"),
      minutesUntilUnlock,
      isEarly: true,
      isLate: false,
      lockReason: "too_early",
      messageKey: "tasks.timeLock.lockedUntil",
    };
  }
  
  // If early but early completion allowed with conditions
  if (isEarly && config.allowEarlyCompletion) {
    return {
      canComplete: true,
      allowEarlyWithReason: true,
      requiresReason: config.earlyRequiresReason,
      requiresPhoto: config.earlyRequiresPhoto,
      unlockAt,
      unlockAtFormatted: format(unlockAt, "HH:mm"),
      minutesUntilUnlock,
      isEarly: true,
      isLate: false,
      lockReason: "not_locked",
      messageKey: config.earlyRequiresReason 
        ? "tasks.timeLock.earlyRequiresReason" 
        : "tasks.timeLock.earlyAllowed",
    };
  }
  
  // Normal: within window or late (late completion is allowed)
  return {
    canComplete: true,
    allowEarlyWithReason: false,
    requiresReason: false,
    requiresPhoto: false,
    unlockAt: null,
    unlockAtFormatted: null,
    minutesUntilUnlock: 0,
    isEarly: false,
    isLate,
    lockReason: "not_locked",
    messageKey: isLate ? "tasks.timeLock.late" : "tasks.timeLock.available",
  };
}

/**
 * Validate completion attempt server-side (for RPC use)
 * Returns an error string if not allowed, null if allowed
 */
export function validateCompletionTime(
  task: Task,
  now: Date = new Date(),
  isManagerOverride: boolean = false
): { allowed: boolean; error?: string; unlockAt?: Date } {
  // Manager override bypasses all checks
  if (isManagerOverride) {
    return { allowed: true };
  }
  
  const status = getTimeLockStatus(task, now);
  
  if (!status.canComplete) {
    return {
      allowed: false,
      error: "TASK_LOCKED_UNTIL",
      unlockAt: status.unlockAt || undefined,
    };
  }
  
  return { allowed: true };
}
