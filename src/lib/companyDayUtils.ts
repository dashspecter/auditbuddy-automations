/**
 * CANONICAL DAY WINDOW UTILITIES
 * 
 * Provides a single source of truth for "today" across all task pipelines.
 * Uses company timezone (or fallback to Europe/Bucharest) for consistency.
 */

import { format, startOfDay, endOfDay, parseISO, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Default timezone for Romania-based companies
const DEFAULT_TIMEZONE = "Europe/Bucharest";

export interface DayWindow {
  /** Start of day in the canonical timezone */
  dayStart: Date;
  /** End of day in the canonical timezone */
  dayEnd: Date;
  /** Date key in yyyy-MM-dd format (canonical) */
  dayKey: string;
  /** Timezone used for this window */
  timezone: string;
  /** Current time in the canonical timezone */
  now: Date;
}

/**
 * Get the canonical "now" in company timezone
 */
export function getCompanyNow(timezone: string = DEFAULT_TIMEZONE): Date {
  const utcNow = new Date();
  // Convert UTC to company timezone
  return toZonedTime(utcNow, timezone);
}

/**
 * Get the canonical day window for a given date.
 * This ensures all pipelines use the same definition of "today".
 */
export function getCompanyDayWindow(
  date?: Date,
  timezone: string = DEFAULT_TIMEZONE
): DayWindow {
  const now = getCompanyNow(timezone);
  const targetDate = date || now;
  
  // Get start and end of day in the canonical timezone
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const dayKey = format(targetDate, "yyyy-MM-dd");

  return {
    dayStart,
    dayEnd,
    dayKey,
    timezone,
    now,
  };
}

/**
 * Get today's window using company timezone
 */
export function getTodayWindow(timezone?: string): DayWindow {
  return getCompanyDayWindow(undefined, timezone);
}

/**
 * Get tomorrow's window using company timezone
 */
export function getTomorrowWindow(timezone?: string): DayWindow {
  const now = getCompanyNow(timezone);
  return getCompanyDayWindow(addDays(now, 1), timezone);
}

/**
 * Normalize a role name for comparison (case-insensitive, trimmed, diacritics removed)
 */
export function normalizeRoleName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .toLowerCase()
    // Remove common diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ");
}

/**
 * Check if two role names match (normalized comparison)
 * Logs in DEV for diagnostics.
 */
export function rolesMatch(
  roleA: string | null | undefined,
  roleB: string | null | undefined
): boolean {
  const normalizedA = normalizeRoleName(roleA);
  const normalizedB = normalizeRoleName(roleB);
  
  if (!normalizedA || !normalizedB) {
    if (import.meta.env.DEV) {
      console.log("[rolesMatch] Empty role:", { roleA, roleB, normalizedA, normalizedB });
    }
    return false;
  }
  
  const matches = normalizedA === normalizedB;
  
  // DEV logging for role comparison diagnostics (only log mismatches to avoid noise)
  if (import.meta.env.DEV && !matches) {
    console.log("[rolesMatch] Mismatch:", { 
      shiftRole: roleA, 
      taskRole: roleB, 
      normShiftRole: normalizedA, 
      normTaskRole: normalizedB 
    });
  }
  
  return matches;
}

/**
 * Parse a date string in yyyy-MM-dd format to a Date
 */
export function parseDayKey(dayKey: string): Date {
  return parseISO(dayKey);
}

/**
 * Format a Date to a day key (yyyy-MM-dd)
 */
export function toDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Check if a date falls on a specific day (using day keys)
 */
export function isSameDay(dateA: Date, dateB: Date): boolean {
  return toDayKey(dateA) === toDayKey(dateB);
}
