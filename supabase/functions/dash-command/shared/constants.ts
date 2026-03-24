/**
 * Shared constants for Dash capability layer.
 * Single source of truth for status values, column names, and module codes.
 * Prevents schema drift between Dash tools and the platform.
 */

// ─── Audit Statuses ───
// Aligns with src/lib/auditHelpers.ts COMPLETED_STATUSES
export const AUDIT_FINISHED_STATUSES = ["completed", "compliant", "non-compliant", "non_compliant"] as const;

// ─── Time-Off Statuses ───
export const TIME_OFF_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const TIME_OFF_TYPES = {
  VACATION: "vacation",
  SICK: "sick",
  PERSONAL: "personal",
  UNPAID: "unpaid",
  OTHER: "other",
} as const;

export const VALID_TIME_OFF_TYPES = Object.values(TIME_OFF_TYPES);

// ─── Entity Statuses ───
export const EMPLOYEE_ACTIVE_STATUS = "active";
export const LOCATION_ACTIVE_STATUS = "active";

// ─── Corrective Action Statuses ───
export const CA_OPEN_STATUSES = ["open", "in_progress"] as const;

// ─── Work Order Statuses ───
export const WO_OPEN_STATUSES = ["open", "in_progress"] as const;

// ─── Module Codes (canonical, matching company_modules.module_name) ───
export const MODULE_CODES = {
  LOCATION_AUDITS: "location_audits",
  WORKFORCE: "workforce",
  CORRECTIVE_ACTIONS: "corrective_actions",
  CMMS: "cmms",
  DOCUMENTS: "documents",
  TASKS: "tasks",
  TESTING_TRAINING: "testing_training",
  NOTIFICATIONS: "notifications",
  WASTAGE: "wastage",
} as const;

// ─── Default Values ───
export const DEFAULT_ANNUAL_VACATION_DAYS = 21;
export const DEFAULT_TIMEZONE = "Europe/Bucharest";
export const MAX_TOOL_ROWS = 200;
