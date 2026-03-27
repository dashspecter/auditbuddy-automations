/**
 * Capability Registry — describes what Dash knows and can do.
 * Each domain entry declares its module, entities, aliases, tools, and maturity.
 * Future modules are onboarded by adding entries here.
 */

export interface CapabilityEntry {
  module: string;
  entities: string[];
  aliases: string[];
  reads: string[];
  actions: string[];
  approvalClass: Record<string, string>;
  maturity: "stable" | "beta" | "planned";
}

export const CAPABILITY_REGISTRY: Record<string, CapabilityEntry> = {
  time_off: {
    module: "workforce",
    entities: ["time_off_request", "employee"],
    aliases: [
      "vacation", "leave", "day off", "PTO", "sick leave", "personal day",
      "time off", "holiday", "absence",
      // Romanian aliases
      "concediu", "zi libera", "zile libere", "concediu medical", "concediu de odihna",
    ],
    reads: [
      "get_time_off_balance",
      "list_time_off_requests",
      "list_pending_time_off_approvals",
      "check_time_off_conflicts",
      "get_team_time_off_calendar",
    ],
    actions: [
      "create_time_off_request",
      "approve_time_off_request",
      "reject_time_off_request",
      "cancel_time_off_request",
    ],
    approvalClass: {
      create_as_manager: "auto_approved",
      create_as_employee: "pending",
      approve: "manager_required",
      reject: "manager_required",
    },
    maturity: "stable",
  },

  // ─── Migrated to capability modules ───
  audits: {
    module: "location_audits",
    entities: ["location_audit", "audit_template", "audit_section", "scheduled_audit"],
    aliases: ["audit", "inspection", "check", "verificare", "schedule audit", "planned audit"],
    reads: ["get_audit_results", "compare_location_performance", "list_scheduled_audits"],
    actions: ["create_audit_template", "schedule_audit_draft", "execute_audit_scheduling", "cancel_scheduled_audit_draft", "execute_cancel_scheduled_audit"],
    approvalClass: { create: "manager_required", schedule: "manager_required", cancel: "manager_required" },
    maturity: "stable",
  },

  corrective_actions: {
    module: "corrective_actions",
    entities: ["corrective_action"],
    aliases: ["CA", "corrective action", "fix", "remediere", "actiune corectiva", "finding", "non-conformity"],
    reads: ["get_open_corrective_actions"],
    actions: ["reassign_corrective_action", "create_ca_draft", "update_ca_status_draft"],
    approvalClass: { reassign: "manager_required", create: "manager_required", update_status: "manager_required" },
    maturity: "stable",
  },

  workforce: {
    module: "workforce",
    entities: ["employee", "shift", "attendance_log", "training_assignment"],
    aliases: ["employee", "staff", "angajat", "personal", "shift", "tura", "schedule", "program", "swap", "schimb", "attendance", "prezenta", "training", "instruire"],
    reads: ["search_employees", "get_attendance_exceptions", "get_attendance_summary", "get_training_gaps"],
    actions: ["create_employee", "create_shift", "update_shift", "delete_shift", "swap_shifts", "update_employee_draft", "deactivate_employee_draft", "correct_attendance_draft", "excuse_late_draft", "create_training_assignment_draft", "execute_training_assignment", "update_training_status_draft", "execute_training_status_update"],
    approvalClass: { create: "manager_required", update: "manager_required", delete: "manager_required", swap: "manager_required", deactivate: "manager_required" },
    maturity: "stable",
  },

  operations: {
    module: "operations",
    entities: ["task", "work_order", "document", "alert"],
    aliases: ["task", "work order", "document", "sarcina", "comanda", "maintenance", "repair", "alert", "notification"],
    reads: ["get_task_completion_summary", "get_work_order_status", "get_document_expiries", "list_tasks", "list_documents", "list_alerts"],
    actions: ["create_work_order_draft", "update_wo_status_draft", "create_task_draft", "update_task_draft", "execute_task_update", "delete_task_draft", "execute_task_deletion", "complete_task_draft", "execute_task_completion", "link_document_draft", "execute_document_link", "create_document_category_draft", "execute_document_category_creation", "delete_document_draft", "execute_document_deletion", "resolve_alert_draft", "execute_alert_resolution"],
    approvalClass: { create: "manager_required", update: "manager_required", delete: "manager_required", resolve: "manager_required" },
    maturity: "stable",
  },

  locations: {
    module: "workforce",
    entities: ["location"],
    aliases: ["location", "store", "branch", "site", "locatie", "magazin"],
    reads: ["list_locations", "get_location_details"],
    actions: ["create_location_draft", "execute_location_creation", "update_location_draft", "execute_location_update", "deactivate_location_draft", "execute_location_deactivation"],
    approvalClass: { create: "manager_required", update: "manager_required", deactivate: "manager_required" },
    maturity: "stable",
  },

  departments: {
    module: "workforce",
    entities: ["department"],
    aliases: ["department", "team", "departament", "echipa"],
    reads: ["list_departments"],
    actions: ["create_department_draft", "execute_create_department", "update_department_draft", "execute_update_department", "delete_department_draft", "execute_delete_department"],
    approvalClass: { create: "manager_required", update: "manager_required", delete: "manager_required" },
    maturity: "stable",
  },

  notifications: {
    module: "notifications",
    entities: ["notification"],
    aliases: ["notification", "announcement", "alert", "message", "notificare", "anunt"],
    reads: ["list_notifications"],
    actions: ["send_notification_draft", "execute_notification_send"],
    approvalClass: { send: "manager_required" },
    maturity: "stable",
  },

  training_programs: {
    module: "testing_training",
    entities: ["training_program"],
    aliases: ["training program", "training module", "course", "program formare", "instruire"],
    reads: ["list_training_programs"],
    actions: ["create_training_program_draft", "execute_training_program_creation"],
    approvalClass: { create: "manager_required" },
    maturity: "stable",
  },

  overview: {
    module: "overview",
    entities: ["location"],
    aliases: ["overview", "summary", "dashboard", "rezumat"],
    reads: ["search_locations", "get_location_overview", "get_cross_module_summary"],
    actions: [],
    approvalClass: {},
    maturity: "stable",
  },

  memory: {
    module: "dash",
    entities: ["user_preference", "org_memory", "saved_workflow"],
    aliases: ["preference", "memory", "shortcut", "workflow"],
    reads: ["get_user_preferences", "get_org_memory", "list_saved_workflows"],
    actions: ["save_user_preference", "save_org_memory", "save_workflow"],
    approvalClass: {},
    maturity: "stable",
  },

  file_processing: {
    module: "dash",
    entities: ["uploaded_file"],
    aliases: ["file", "upload", "PDF", "document", "spreadsheet"],
    reads: [],
    actions: ["parse_uploaded_file", "transform_spreadsheet_to_schedule", "transform_sop_to_training", "transform_compliance_doc_to_audit"],
    approvalClass: { parse: "auto_approved" },
    maturity: "stable",
  },
};

/**
 * Get all registered tool names across all capabilities.
 */
export function getAllRegisteredTools(): string[] {
  const tools: string[] = [];
  for (const cap of Object.values(CAPABILITY_REGISTRY)) {
    tools.push(...cap.reads, ...cap.actions);
  }
  return tools;
}

/**
 * Find which capability domain a tool belongs to.
 */
export function findCapabilityForTool(toolName: string): string | null {
  for (const [domain, cap] of Object.entries(CAPABILITY_REGISTRY)) {
    if (cap.reads.includes(toolName) || cap.actions.includes(toolName)) {
      return domain;
    }
  }
  return null;
}
