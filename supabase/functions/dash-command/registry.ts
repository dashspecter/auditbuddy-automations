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
    entities: ["location_audit", "audit_template", "audit_section"],
    aliases: ["audit", "inspection", "check", "verificare"],
    reads: ["get_audit_results", "compare_location_performance"],
    actions: ["create_audit_template"],
    approvalClass: { create: "manager_required" },
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
    entities: ["employee", "shift", "attendance_log"],
    aliases: ["employee", "staff", "angajat", "personal", "shift", "tura", "schedule", "program", "swap", "schimb"],
    reads: ["search_employees", "get_attendance_exceptions"],
    actions: ["create_employee", "create_shift", "update_shift", "delete_shift", "swap_shifts"],
    approvalClass: { create: "manager_required", update: "manager_required", delete: "manager_required", swap: "manager_required" },
    maturity: "stable",
  },

  operations: {
    module: "operations",
    entities: ["task", "work_order", "document", "training_assignment"],
    aliases: ["task", "work order", "document", "training", "sarcina", "comanda"],
    reads: ["get_task_completion_summary", "get_work_order_status", "get_document_expiries", "get_training_gaps"],
    actions: [],
    approvalClass: {},
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
