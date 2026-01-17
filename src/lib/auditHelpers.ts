/**
 * Audit status helper functions
 * Single source of truth for determining audit completion/draft/discarded status
 */

export interface AuditStatusFields {
  status?: string | null;
  overall_score?: number | null;
  updated_at?: string | null;
  created_at: string;
}

// Statuses that indicate a completed audit
const COMPLETED_STATUSES = ['completed', 'compliant', 'non-compliant', 'non_compliant'];

// Statuses that indicate a draft/in-progress audit
const DRAFT_STATUSES = ['draft', 'in_progress'];

/**
 * Check if an audit is completed
 * TRUE if: status indicates completion OR overall_score is set (indicating answers were submitted)
 */
export const isCompletedAudit = (audit: AuditStatusFields): boolean => {
  const status = (audit.status || '').toLowerCase().replace('_', '-');
  
  // If status indicates completion
  if (COMPLETED_STATUSES.includes(status)) {
    return true;
  }
  
  // If overall_score is set and positive, consider it completed
  if (audit.overall_score !== null && audit.overall_score !== undefined && audit.overall_score > 0) {
    return true;
  }
  
  return false;
};

/**
 * Check if an audit is a draft
 * TRUE if: status is draft/in_progress AND not completed
 */
export const isDraftAudit = (audit: AuditStatusFields): boolean => {
  if (isCompletedAudit(audit)) {
    return false;
  }
  
  const status = (audit.status || '').toLowerCase();
  return DRAFT_STATUSES.includes(status);
};

/**
 * Check if an audit should be hidden (discarded)
 * TRUE if: status is discarded AND it's NOT completed
 */
export const isDiscardedAudit = (audit: AuditStatusFields): boolean => {
  const status = (audit.status || '').toLowerCase();
  
  // Never consider completed audits as discarded
  if (isCompletedAudit(audit)) {
    return false;
  }
  
  return status === 'discarded';
};

/**
 * Check if an audit is scheduled (for future)
 */
export const isScheduledAudit = (audit: AuditStatusFields): boolean => {
  const status = (audit.status || '').toLowerCase();
  return status === 'scheduled';
};

/**
 * Get the best date for sorting completed audits
 * Uses updated_at first, then created_at
 */
export const getCompletionDate = (audit: {
  updated_at?: string | null;
  created_at: string;
}): Date => {
  const dateStr = audit.updated_at || audit.created_at;
  return new Date(dateStr);
};
