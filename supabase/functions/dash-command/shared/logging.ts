/**
 * Shared logging for Dash capability layer.
 * All capability actions are logged consistently.
 */

export interface CapabilityLogEntry {
  companyId: string;
  userId: string;
  sessionId?: string;
  capability: string;        // e.g. "time_off.create", "time_off.get_balance"
  actionType: "read" | "write";
  riskLevel: "low" | "medium" | "high";
  request: any;
  result: any;
  entitiesAffected?: string[];
  module: string;
}

/**
 * Log a capability action to dash_action_log.
 * Non-blocking — errors are caught and logged but don't fail the operation.
 */
export async function logCapabilityAction(
  sbService: any,
  entry: CapabilityLogEntry
): Promise<void> {
  try {
    await sbService.from("dash_action_log").insert({
      company_id: entry.companyId,
      user_id: entry.userId,
      session_id: entry.sessionId || null,
      action_type: entry.actionType,
      action_name: entry.capability,
      risk_level: entry.riskLevel,
      request_json: entry.request,
      result_json: typeof entry.result === "object" && entry.result?.ok !== undefined
        ? { ok: entry.result.ok, code: entry.result.code, preview: JSON.stringify(entry.result.data || entry.result).substring(0, 500) }
        : entry.result,
      status: entry.result?.ok === false ? "error" : "success",
      approval_status: entry.actionType === "write" ? "approved" : "not_required",
      entities_affected: entry.entitiesAffected || [],
      modules_touched: [entry.module],
    });
  } catch (err) {
    console.error(`[logging] Failed to log capability action "${entry.capability}":`, err);
  }
}
