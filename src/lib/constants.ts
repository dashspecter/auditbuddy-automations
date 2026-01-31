/**
 * Application-wide constants
 * Centralized location for magic strings and configuration values
 */

// File upload limits
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Image optimization
export const MAX_IMAGE_WIDTH = 1920;
export const MAX_IMAGE_HEIGHT = 1920;
export const IMAGE_QUALITY = 0.85;

// Query stale times (in milliseconds)
export const STALE_TIME = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes (default)
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm';
export const TIME_FORMAT = 'HH:mm';
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';

// Status values
export const AUDIT_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non-compliant',
  SCHEDULED: 'scheduled',
  DISCARDED: 'discarded',
} as const;

export const EQUIPMENT_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
  RETIRED: 'retired',
} as const;

export const INTERVENTION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
} as const;

// Roles
export const PLATFORM_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CHECKER: 'checker',
} as const;

export const COMPANY_ROLES = {
  OWNER: 'company_owner',
  ADMIN: 'company_admin',
  MEMBER: 'company_member',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  ALERT: 'alert',
} as const;

// Recurrence patterns
export const RECURRENCE_PATTERNS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  NONE: 'none',
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

// Module names
export const MODULES = {
  LOCATION_AUDITS: 'location_audits',
  STAFF_AUDITS: 'staff_audits',
  EQUIPMENT: 'equipment_management',
  DOCUMENTS: 'document_management',
  TESTING: 'testing_training',
  NOTIFICATIONS: 'notifications',
  MANUAL_METRICS: 'manual_metrics',
  REPORTS: 'reports_analytics',
  WASTAGE: 'wastage',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'dashspect_onboarding_completed',
  THEME_PREFERENCE: 'dashspect_theme',
  LAST_VISITED_LOCATION: 'dashspect_last_location',
} as const;

// API endpoints (for edge functions)
export const API_ENDPOINTS = {
  CREATE_USER: '/functions/v1/create-user',
  PROCESS_RECURRING_AUDITS: '/functions/v1/process-recurring-audits',
  PROCESS_RECURRING_MAINTENANCE: '/functions/v1/process-recurring-maintenance',
  PROCESS_RECURRING_NOTIFICATIONS: '/functions/v1/process-recurring-notifications',
  CHECK_EXPIRED_TRIALS: '/functions/v1/check-expired-trials',
} as const;

// Validation limits
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 5000,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
} as const;

// Toast durations (in milliseconds)
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000,
} as const;

// Trial period
export const TRIAL_DAYS = 7;

// Type exports for type safety
export type AuditStatus = typeof AUDIT_STATUS[keyof typeof AUDIT_STATUS];
export type EquipmentStatus = typeof EQUIPMENT_STATUS[keyof typeof EQUIPMENT_STATUS];
export type InterventionStatus = typeof INTERVENTION_STATUS[keyof typeof INTERVENTION_STATUS];
export type EmployeeStatus = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS];
export type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];
export type CompanyRole = typeof COMPANY_ROLES[keyof typeof COMPANY_ROLES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type RecurrencePattern = typeof RECURRENCE_PATTERNS[keyof typeof RECURRENCE_PATTERNS];
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type ModuleName = typeof MODULES[keyof typeof MODULES];
