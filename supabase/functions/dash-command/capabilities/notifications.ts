/**
 * Notifications Capability Module
 * Handles listing and sending company notifications.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission, isManagerLevel } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function listNotifications(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  let q = sb.from("notifications")
    .select("id, title, message, type, is_active, target_roles, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (args.active_only) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const notifications = data ?? [];

  return success({ count: notifications.length, notifications });
}


// ─── Draft Tools ───

export async function sendNotificationDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "notifications", ctx });
  if (!permCheck.ok) return permCheck;

  const draft = {
    title: args.title || null,
    message: args.message || null,
    type: args.type || "info",
    target_roles: args.target_roles || null,
    scheduled_for: args.scheduled_for || null,
    expires_at: args.expires_at || null,
  };

  const missing: string[] = [];
  if (!draft.title) missing.push("title");
  if (!draft.message) missing.push("message");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId,
      user_id: userId,
      action_name: "send_notification",
      action_type: "write",
      risk_level: "medium",
      preview_json: draft,
      status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  const targetRolesLabel = draft.target_roles?.length
    ? draft.target_roles.join(", ")
    : "all";

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Send Notification",
    summary: missing.length > 0
      ? `Draft notification — missing: ${missing.join(", ")}`
      : `Send ${draft.type} notification to ${targetRolesLabel} roles: ${draft.title}`,
    risk: "medium",
    affected: [draft.title, ...(draft.target_roles || [])].filter(Boolean),
    pending_action_id: pendingActionId,
    draft,
    missing_fields: missing,
    can_approve: missing.length === 0,
  }));

  return success({
    type: "notification_draft",
    draft,
    missing_fields: missing,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "medium",
    message: missing.length > 0
      ? `Draft created but missing: ${missing.join(", ")}. Please provide these to proceed.`
      : `Notification draft ready: "${draft.title}". A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
  });
}

export async function executeNotificationSend(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "notifications", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa || pa.company_id !== companyId || pa.status !== "pending") {
    return capabilityError("Pending action not found or already processed.");
  }

  const d = pa.preview_json;

  const { data, error } = await sbService.from("notifications").insert({
    title: d.title,
    message: d.message,
    type: d.type || "info",
    target_roles: d.target_roles || null,
    is_active: true,
    company_id: companyId,
    created_by: userId,
    scheduled_for: d.scheduled_for || null,
    expires_at: d.expires_at || null,
  }).select("id, title").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed to send notification: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    execution_result: { notification_id: data.id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    companyId,
    userId,
    capability: "notifications.send",
    actionType: "write",
    riskLevel: "medium",
    module: "notifications",
    request: { title: d.title, type: d.type, target_roles: d.target_roles },
    result: { notification_id: data.id, title: data.title },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Notification Sent",
    summary: `Notification "${data.title}" has been sent successfully.`,
    changes: [`Created notification: ${data.title}`],
  }));

  return success({ notification_id: data.id, title: data.title });
}
