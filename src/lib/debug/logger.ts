/**
 * Stability Debug Logger
 * 
 * A minimal, gated logging utility for stability diagnostics.
 * Only outputs in development mode or when DEBUG_STABILITY env var is set.
 * 
 * IMPORTANT: This logger is for internal diagnostics only.
 * It does NOT show any user-visible noise or modify functionality.
 * 
 * Usage:
 * ```ts
 * import { logDebug, logWarn, logError, logEvent } from '@/lib/debug/logger';
 * 
 * logDebug('bootstrap', { stage: 'auth-complete', userId: user.id });
 * logEvent('nav-resolve', { items: visibleItems.length, elapsed: 42 });
 * logWarn('visibility', 'Session validation failed');
 * logError('bootstrap', 'Critical error during company fetch', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'event';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  payload?: unknown;
}

// In-memory buffer for recent logs (useful for debugging)
const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

/**
 * Check if stability debugging is enabled
 */
const isEnabled = (): boolean => {
  // Always enabled in development
  if (import.meta.env.DEV) return true;
  
  // Can be enabled in production via localStorage for debugging
  if (typeof window !== 'undefined') {
    return localStorage.getItem('DEBUG_STABILITY') === 'true';
  }
  
  return false;
};

/**
 * Format timestamp for log output
 */
const formatTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().slice(11, 23); // HH:mm:ss.SSS
};

/**
 * Add entry to in-memory buffer
 */
const bufferLog = (entry: LogEntry): void => {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
};

/**
 * Format log output
 */
const formatLog = (level: LogLevel, category: string, message: string, payload?: unknown): void => {
  if (!isEnabled()) return;
  
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
  
  const entry: LogEntry = {
    timestamp,
    level,
    category,
    message,
    payload,
  };
  
  bufferLog(entry);
  
  const style = getLogStyle(level);
  
  if (payload !== undefined) {
    console.log(`%c${prefix} ${message}`, style, payload);
  } else {
    console.log(`%c${prefix} ${message}`, style);
  }
};

/**
 * Get console styling based on log level
 */
const getLogStyle = (level: LogLevel): string => {
  switch (level) {
    case 'debug':
      return 'color: #888;';
    case 'info':
      return 'color: #2196F3;';
    case 'warn':
      return 'color: #FF9800; font-weight: bold;';
    case 'error':
      return 'color: #F44336; font-weight: bold;';
    case 'event':
      return 'color: #4CAF50;';
    default:
      return '';
  }
};

// ============================================
// Public API
// ============================================

/**
 * Log debug information (lowest priority)
 */
export const logDebug = (category: string, messageOrPayload: string | unknown, payload?: unknown): void => {
  if (typeof messageOrPayload === 'string') {
    formatLog('debug', category, messageOrPayload, payload);
  } else {
    formatLog('debug', category, '', messageOrPayload);
  }
};

/**
 * Log informational message
 */
export const logInfo = (category: string, message: string, payload?: unknown): void => {
  formatLog('info', category, message, payload);
};

/**
 * Log warning (potential issue)
 */
export const logWarn = (category: string, message: string, payload?: unknown): void => {
  formatLog('warn', category, message, payload);
};

/**
 * Log error (definite problem)
 */
export const logError = (category: string, message: string, error?: unknown): void => {
  formatLog('error', category, message, error);
};

/**
 * Log a discrete event (for tracking state changes)
 */
export const logEvent = (event: string, payload?: unknown): void => {
  formatLog('event', 'event', event, payload);
};

/**
 * Get the current log buffer (for debugging)
 */
export const getLogBuffer = (): LogEntry[] => {
  return [...logBuffer];
};

/**
 * Clear the log buffer
 */
export const clearLogBuffer = (): void => {
  logBuffer.length = 0;
};

/**
 * Enable stability debugging in production (persists in localStorage)
 */
export const enableStabilityDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('DEBUG_STABILITY', 'true');
    console.log('[Stability Debug] Enabled. Refresh to see logs.');
  }
};

/**
 * Disable stability debugging
 */
export const disableStabilityDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('DEBUG_STABILITY');
    console.log('[Stability Debug] Disabled.');
  }
};

// ============================================
// Specific Event Loggers (typed convenience)
// ============================================

/**
 * Log route change event
 */
export const logRouteChange = (from: string, to: string, trigger?: string): void => {
  logEvent('route-change', { from, to, trigger });
};

/**
 * Log auth state change
 */
export const logAuthChange = (event: string, hasSession: boolean, userId?: string): void => {
  logEvent('auth-change', { event, hasSession, userId: userId?.slice(0, 8) });
};

/**
 * Log company context change
 */
export const logCompanyChange = (companyId: string | null, status: string): void => {
  logEvent('company-change', { companyId: companyId?.slice(0, 8), status });
};

/**
 * Log navigation resolution
 */
export const logNavResolve = (
  itemCount: number,
  status: 'loading' | 'ready' | 'error',
  elapsed?: number
): void => {
  logEvent('nav-resolve', { itemCount, status, elapsed });
};

/**
 * Log visibility change
 */
export const logVisibilityChange = (visible: boolean, action?: string): void => {
  logEvent('visibility-change', { visible, action });
};

/**
 * Log bootstrap stage
 */
export const logBootstrap = (
  stage: 'start' | 'auth' | 'company' | 'modules' | 'permissions' | 'nav' | 'ready' | 'error',
  details?: unknown
): void => {
  logEvent('bootstrap', { stage, ...((typeof details === 'object' && details) || { details }) });
};
