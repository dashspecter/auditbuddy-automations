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
  let q = sb.from("corrective_actions").select("id, title, severity, status, due_at, created_at, location_id, locations(name), owner_user_id")
    .eq("company_id", companyId).in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  if (args.severity) q = q.eq("severity", args.severity);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  return success({
    corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_at: ca.due_at, location: ca.locations?.name, assigned_to: ca.owner_user_id })),
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
    .select("id, title, owner_user_id, location_id, locations(name), company_id")
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
      old_assigned_to: caData.owner_user_id,
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
    .update({ owner_user_id: preview.new_assigned_to, updated_at: new Date().toISOString() })
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

// ─── B2: Create Corrective Action ───

export async function createCaDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;

  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (locationName && !locationId) {
    const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1);
    if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
  }

  // Resolve owner by name
  let ownerUserId = args.owner_user_id || null;
  let ownerName = args.owner_name || null;
  if (ownerName && !ownerUserId) {
    const { data: empData } = await sb.from("employees").select("id, full_name, user_id").eq("company_id", companyId).ilike("full_name", `%${ownerName}%`).limit(1);
    if (empData?.[0]) { ownerUserId = empData[0].user_id || empData[0].id; ownerName = empData[0].full_name; }
  }

  const dueAt = args.due_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const draft = {
    title: args.title,
    description: args.description || null,
    severity: args.severity || "medium",
    location_id: locationId,
    location_name: locationName,
    owner_user_id: ownerUserId,
    owner_name: ownerName,
    due_at: dueAt,
    source_type: args.source_type || "manual",
  };

  const missing: string[] = [];
  if (!draft.title) missing.push("title");
  if (!locationId) missing.push("location");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId, action_name: "create_corrective_action",
      action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Corrective Action",
    summary: missing.length > 0 ? `Draft CA "${draft.title || "?"}" — missing: ${missing.join(", ")}` : `Create CA "${draft.title}" (${draft.severity}) at ${locationName}, due ${draft.due_at?.split("T")[0]}`,
    risk: "high", affected: [draft.title, locationName, draft.severity].filter(Boolean),
    pending_action_id: pendingActionId, draft, missing_fields: missing, can_approve: missing.length === 0,
  }));

  return success({ type: "ca_draft", draft, missing_fields: missing, pending_action_id: pendingActionId, requires_approval: true, risk_level: "high",
    message: missing.length > 0 ? `CA draft missing: ${missing.join(", ")}.` : `CA draft ready. Approve to create.` });
}

export async function executeCaCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const { data: caData, error: caError } = await sbService.from("corrective_actions").insert({
    company_id: companyId, title: draft.title, description: draft.description, severity: draft.severity,
    location_id: draft.location_id, owner_user_id: draft.owner_user_id || userId, due_at: draft.due_at,
    source_type: draft.source_type || "manual", status: "open", created_by: userId,
  }).select("id, title").single();

  if (caError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: caError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "CA Creation Failed", summary: caError.message, errors: [caError.message] }));
    return capabilityError(`Failed to create CA: ${caError.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { ca_id: caData.id }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "corrective_actions.create", actionType: "write", riskLevel: "high", request: draft, result: { ca_id: caData.id }, entitiesAffected: [caData.id], module: "corrective_actions" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "Corrective Action Created", summary: `"${caData.title}" created successfully.`, changes: [`CA "${caData.title}" created`] }));
  return success({ type: "ca_created", ca_id: caData.id, ca_title: caData.title, message: `Corrective action "${caData.title}" created successfully.` });
}

// ─── B2: Update CA Status ───

export async function updateCaStatusDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;

  // Find CA by ID or title
  let caData: any = null;
  if (args.ca_id) {
    const { data } = await sb.from("corrective_actions").select("id, title, status, severity, company_id").eq("id", args.ca_id).eq("company_id", companyId).maybeSingle();
    caData = data;
  } else if (args.ca_title) {
    const { data } = await sb.from("corrective_actions").select("id, title, status, severity, company_id").eq("company_id", companyId).ilike("title", `%${args.ca_title}%`).limit(1);
    caData = data?.[0];
  }
  if (!caData) return capabilityError("Corrective action not found.");

  const newStatus = args.new_status;
  if (!newStatus) return capabilityError("Missing new_status.");

  const draft = { ca_id: caData.id, ca_title: caData.title, old_status: caData.status, new_status: newStatus, reason: args.reason };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "update_ca_status",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `Update CA Status: "${caData.title}"`,
    summary: `Change status from "${caData.status}" to "${newStatus}".${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "high", affected: [caData.title], pending_action_id: paData?.id, draft, can_approve: true,
  }));

  return success({ type: "ca_status_draft", draft, pending_action_id: paData?.id, requires_approval: true, message: `CA status change draft ready. Approve to proceed.` });
}

export async function executeCaStatusUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "corrective_actions", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions").select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const draft = pa.preview_json as any;
  const updateFields: any = { status: draft.new_status, updated_at: new Date().toISOString() };
  if (draft.new_status === "closed") updateFields.closed_at = new Date().toISOString();

  const { error } = await sbService.from("corrective_actions").update(updateFields).eq("id", draft.ca_id).eq("company_id", companyId);
  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    structuredEvents.push(makeStructuredEvent("execution_result", { status: "error", title: "CA Status Update Failed", summary: error.message, errors: [error.message] }));
    return capabilityError(`Status update failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({ status: "executed", approved_at: new Date().toISOString(), approved_by: userId, execution_result: { success: true }, updated_at: new Date().toISOString() }).eq("id", pa.id);
  await logCapabilityAction(sbService, { companyId, userId, capability: "corrective_actions.update_status", actionType: "write", riskLevel: "high", request: draft, result: { ca_id: draft.ca_id, new_status: draft.new_status }, entitiesAffected: [draft.ca_id], module: "corrective_actions" });
  structuredEvents.push(makeStructuredEvent("execution_result", { status: "success", title: "CA Status Updated", summary: `"${draft.ca_title}" status changed to "${draft.new_status}".`, changes: [`Status: ${draft.old_status} → ${draft.new_status}`] }));
  return success({ type: "ca_status_updated", ca_id: draft.ca_id, new_status: draft.new_status, message: `CA "${draft.ca_title}" status updated to "${draft.new_status}".` });
}
