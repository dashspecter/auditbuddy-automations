/**
 * Corrective Actions Capability Module
 * Phase 8: Standardized on CapabilityResult + permission enforcement.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function getOpenCorrectiveActions(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  let q = sb.from("corrective_actions").select("id, title, severity, status, due_at, created_at, location_id, locations(name), assigned_to")
    .eq("company_id", companyId).in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  if (args.severity) q = q.eq("severity", args.severity);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_at: ca.due_at, location: ca.locations?.name, assigned_to: ca.assigned_to })),
    total: c.total, returned: c.returned, truncated: c.truncated,
  });
}

// ─── Draft Tools ───

export async function reassignCorrectiveAction(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: caData, error: caError } = await sb.from("corrective_actions")
    .select("id, title, assigned_to, location_id, locations(name), company_id")
    .eq("id", args.corrective_action_id)
    .maybeSingle();

  if (caError || !caData) return capabilityError("Corrective action not found.");
  if (caData.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");

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

  return success({
    type: "action_preview",
    pending_action_id: paData?.id,
    message: `CA reassignment draft created. Please review and approve to proceed.`,
  });
}

// ─── Execute Tools ───

export async function executeCaReassignment(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;

  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

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
    return capabilityError(`Reassignment failed: ${updateError.message}`);
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

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "corrective_actions.reassign", actionType: "write",
    riskLevel: "high", request: preview,
    result: { ca_id: preview.ca_id, new_assigned_to: preview.new_assigned_to },
    entitiesAffected: [preview.ca_id], module: "corrective_actions",
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Corrective Action Reassigned",
    summary: `"${preview.ca_title}" reassigned to ${preview.new_assigned_name || preview.new_assigned_to}.`,
    changes: [`CA "${preview.ca_title}" reassigned`, `New assignee: ${preview.new_assigned_name || preview.new_assigned_to}`],
  }));

  return success({
    type: "ca_reassigned",
    ca_id: preview.ca_id,
    ca_title: preview.ca_title,
    new_assigned_to: preview.new_assigned_to,
    message: `Corrective action "${preview.ca_title}" reassigned successfully.`,
  });
}
