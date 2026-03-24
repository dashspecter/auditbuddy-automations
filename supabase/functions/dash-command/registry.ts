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

  // ─── Future module stubs (planned, not yet implemented) ───
  audits: {
    module: "location_audits",
    entities: ["location_audit", "audit_template", "audit_section"],
    aliases: ["audit", "inspection", "check", "verificare"],
    reads: ["get_audit_results", "compare_location_performance"],
    actions: ["create_audit_template"],
    approvalClass: { create: "manager_required" },
    maturity: "beta", // Existing tools, not yet migrated to capability layer
  },

  corrective_actions: {
    module: "corrective_actions",
    entities: ["corrective_action"],
    aliases: ["CA", "corrective action", "fix", "remediere", "actiune corectiva"],
    reads: ["get_open_corrective_actions"],
    actions: ["reassign_corrective_action"],
    approvalClass: { reassign: "manager_required" },
    maturity: "beta",
  },

  workforce: {
    module: "workforce",
    entities: ["employee", "shift", "attendance_log"],
    aliases: ["employee", "staff", "angajat", "personal", "shift", "tura"],
    reads: ["search_employees", "get_attendance_exceptions"],
    actions: ["create_employee", "create_shift"],
    approvalClass: { create: "manager_required" },
    maturity: "beta",
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
