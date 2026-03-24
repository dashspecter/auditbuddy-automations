/**
 * Corrective Actions Capability Module
 * Migrated from index.ts — all CA domain logic lives here.
 */
import { MAX_TOOL_ROWS } from "../shared/constants.ts";

function cap<T>(data: T[] | null, limit = MAX_TOOL_ROWS) {
  const items = data ?? [];
  const total = items.length;
  return { items: items.slice(0, limit), total, returned: Math.min(total, limit), truncated: total > limit };
}

function makeStructuredEvent(type: string, data: any): string {
  return JSON.stringify({ type: "structured_event", event_type: type, data });
}

// ─── Read Tools ───

export async function getOpenCorrectiveActions(
  sb: any, companyId: string, args: any
): Promise<any> {
  const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
  let q = sb.from("corrective_actions").select("id, title, severity, status, due_at, created_at, location_id, locations(name), assigned_to")
    .in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  if (args.severity) q = q.eq("severity", args.severity);
  const { data, error } = await q;
  if (error) return { error: error.message };
  const c = cap(data, limit);
  return { ...c, corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_at: ca.due_at, location: ca.locations?.name, assigned_to: ca.assigned_to })) };
}

// ─── Draft Tools ───

export async function reassignCorrectiveAction(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[]
): Promise<any> {
  const { data: caData, error: caError } = await sb.from("corrective_actions")
    .select("id, title, assigned_to, location_id, locations(name), company_id")
    .eq("id", args.corrective_action_id)
    .maybeSingle();

  if (caError || !caData) return { error: "Corrective action not found." };
  if (caData.company_id !== companyId) return { error: "Cross-tenant action rejected." };

  let newAssigneeName = args.new_assigned_name || "Unknown";
  if (!args.new_assigned_name && args.new_assigned_to) {
    const { data: empLookup } = await sb.from("employees")
      .select("full_name")
      .eq("id", args.new_assigned_to)
      .maybeSingle();
    if (empLookup) newAssigneeName = empLookup.full_name;
  }

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId,
    user_id: userId,
    action_name: "reassign_corrective_action",
    action_type: "write",
    risk_level: "high",
    preview_json: {
      ca_id: caData.id,
      ca_title: caData.title,
      old_assigned_to: caData.assigned_to,
      new_assigned_to: args.new_assigned_to,
      new_assigned_name: newAssigneeName,
      reason: args.reason,
    },
    status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Reassign CA: "${caData.title}"`,
    summary: `Change assignee to ${newAssigneeName}. Reason: ${args.reason || "Not specified"}.`,
    risk: "high",
    affected: [caData.title, newAssigneeName].filter(Boolean),
    pending_action_id: paData?.id,
    can_approve: true,
    draft: {
      ca_id: caData.id,
      ca_title: caData.title,
      new_assigned_to: args.new_assigned_to,
      new_assigned_name: newAssigneeName,
      reason: args.reason,
    },
  }));

  return {
    type: "action_preview",
    pending_action_id: paData?.id,
    message: `CA reassignment draft created. Please review and approve to proceed.`,
  };
}

// ─── Execute Tools ───

export async function executeCaReassignment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[]
): Promise<any> {
  if (!args.pending_action_id) return { error: "Missing pending_action_id." };

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa) return { error: "Pending action not found." };
  if (pa.company_id !== companyId) return { error: "Cross-tenant action rejected." };
  if (pa.status !== "pending") return { error: `Action already ${pa.status}.` };

  const preview = pa.preview_json as any;

  const { error: updateError } = await sbService.from("corrective_actions")
    .update({ assigned_to: preview.new_assigned_to, updated_at: new Date().toISOString() })
    .eq("id", preview.ca_id)
    .eq("company_id", companyId);

  if (updateError) {
    await sbService.from("dash_pending_actions")
      .update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() })
      .eq("id", pa.id);

    structuredEvents.push(makeStructuredEvent("execution_result", {
      status: "error",
      title: "Reassignment Failed",
      summary: updateError.message,
      errors: [updateError.message],
    }));
    return { error: `Reassignment failed: ${updateError.message}` };
  }

  await sbService.from("dash_pending_actions")
    .update({
      status: "executed",
      approved_at: new Date().toISOString(),
      approved_by: userId,
      execution_result: { success: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", pa.id);

  await sbService.from("dash_action_log").insert({
    company_id: companyId,
    user_id: userId,
    action_type: "write",
    action_name: "reassign_corrective_action",
    risk_level: "high",
    request_json: preview,
    result_json: { ca_id: preview.ca_id, new_assigned_to: preview.new_assigned_to },
    status: "success",
    approval_status: "approved",
    entities_affected: [preview.ca_id],
    modules_touched: ["corrective_actions"],
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Corrective Action Reassigned",
    summary: `"${preview.ca_title}" reassigned to ${preview.new_assigned_name || preview.new_assigned_to}.`,
    changes: [`CA "${preview.ca_title}" reassigned`, `New assignee: ${preview.new_assigned_name || preview.new_assigned_to}`],
  }));

  return {
    type: "ca_reassigned",
    ca_id: preview.ca_id,
    ca_title: preview.ca_title,
    new_assigned_to: preview.new_assigned_to,
    message: `Corrective action "${preview.ca_title}" reassigned successfully.`,
  };
}
