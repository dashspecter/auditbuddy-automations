/**
 * Messaging Capability Module
 * Phase 3: WhatsApp templates, outbound messages, notification rules.
 * Tables: wa_message_templates, outbound_messages, message_events, notification_rules
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";

// ─── Read Tools ───

export async function listWhatsappTemplates(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("wa_message_templates")
    .select("id, name, language, category, header_type, body, footer, approval_status, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (args.approval_status) q = q.eq("approval_status", args.approval_status);
  if (args.category) q = q.eq("category", args.category);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const c = cap(data, limit);
  return success({
    total: c.total, returned: c.returned, truncated: c.truncated,
    templates: c.items.map((t: any) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      header_type: t.header_type,
      body: t.body,
      footer: t.footer,
      approval_status: t.approval_status,
    })),
  });
}

export async function listOutboundMessages(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Scope: join through employees to enforce company
  let q = sb.from("outbound_messages")
    .select("id, employee_id, employees(full_name), channel, status, scheduled_for, created_at, recipient_phone_e164, template_id, wa_message_templates(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.channel) q = q.eq("channel", args.channel);
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const c = cap(data, limit);
  return success({
    total: c.total, returned: c.returned, truncated: c.truncated,
    messages: c.items.map((m: any) => ({
      id: m.id,
      employee: m.employees?.full_name,
      channel: m.channel,
      template: m.wa_message_templates?.name,
      status: m.status,
      recipient_phone: m.recipient_phone_e164,
      scheduled_for: m.scheduled_for,
      created_at: m.created_at,
    })),
  });
}

export async function listNotificationRules(
  sb: any, companyId: string, _args: any
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("notification_rules")
    .select("id, event_type, channel, target_roles, throttle_max_per_day, escalation_after_minutes, escalation_channel, is_active, created_at")
    .eq("company_id", companyId)
    .order("event_type", { ascending: true })
    .limit(100);

  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    rules: (data || []).map((r: any) => ({
      id: r.id,
      event_type: r.event_type,
      channel: r.channel,
      target_roles: r.target_roles,
      throttle_max_per_day: r.throttle_max_per_day,
      escalation_after_minutes: r.escalation_after_minutes,
      escalation_channel: r.escalation_channel,
      is_active: r.is_active,
    })),
  });
}

// ─── Write Tools ───

export async function sendWhatsappMessageDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "whatsapp_messaging");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  if (!args.template_name && !args.template_id) return capabilityError("Provide template_name or template_id.");

  // Resolve template
  let templateId = args.template_id || null;
  let templateName = args.template_name || null;
  let templateBody = null;

  if (!templateId && templateName) {
    const { data: tpl } = await sb.from("wa_message_templates")
      .select("id, name, body, approval_status").eq("company_id", companyId)
      .ilike("name", `%${templateName}%`).limit(1).maybeSingle();
    if (!tpl) return capabilityError(`No WhatsApp template matching "${templateName}".`);
    if (tpl.approval_status !== "approved") return capabilityError(`Template "${tpl.name}" is not approved (status: ${tpl.approval_status}). Only approved templates can be sent.`);
    templateId = tpl.id;
    templateName = tpl.name;
    templateBody = tpl.body;
  }

  // Resolve recipients
  const recipients: Array<{ employee_id: string; name: string; phone: string }> = [];

  if (args.employee_name) {
    const { data: emps } = await sb.from("employees")
      .select("id, full_name, phone").eq("company_id", companyId)
      .ilike("full_name", `%${args.employee_name}%`).limit(10);
    for (const e of emps || []) {
      if (e.phone) recipients.push({ employee_id: e.id, name: e.full_name, phone: e.phone });
    }
    if (recipients.length === 0) return capabilityError(`No employees with phone matching "${args.employee_name}".`);
  } else if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id, name")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    const { data: emps } = await sb.from("employees")
      .select("id, full_name, phone").eq("company_id", companyId)
      .eq("location_id", loc.id).eq("status", "active").limit(200);
    for (const e of emps || []) {
      if (e.phone) recipients.push({ employee_id: e.id, name: e.full_name, phone: e.phone });
    }
    if (recipients.length === 0) return capabilityError(`No active employees with phone numbers at "${loc.name}".`);
  } else {
    return capabilityError("Provide employee_name or location_name to target recipients.");
  }

  const scheduledFor = args.scheduled_for || null;

  const draft = {
    template_id: templateId,
    template_name: templateName,
    template_body: templateBody,
    variables: args.variables || {},
    recipients,
    recipient_count: recipients.length,
    scheduled_for: scheduledFor,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "send_whatsapp_message", risk_level: "medium",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  const recipientSummary = recipients.length === 1
    ? recipients[0].name
    : `${recipients.length} recipients`;

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id,
    action_name: "send_whatsapp_message",
    risk_level: "medium",
    title: "Send WhatsApp Message",
    summary: `Send template **"${templateName}"** via WhatsApp to ${recipientSummary}.${scheduledFor ? ` Scheduled for ${scheduledFor}.` : ""}`,
    fields: [
      { label: "Template", value: templateName },
      { label: "Recipients", value: String(recipients.length) },
      ...(recipients.length <= 5 ? recipients.map(r => ({ label: "→", value: `${r.name} (${r.phone})` })) : []),
      ...(scheduledFor ? [{ label: "Scheduled For", value: scheduledFor }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeeSendWhatsappMessage(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "whatsapp_messaging");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  // Insert outbound_messages for each recipient
  const rows = (d.recipients || []).map((r: any) => ({
    company_id: companyId,
    employee_id: r.employee_id,
    channel: "whatsapp",
    template_id: d.template_id,
    recipient_phone_e164: r.phone,
    variables: d.variables || {},
    status: "queued",
    scheduled_for: d.scheduled_for || null,
    created_by: userId,
  }));

  if (rows.length === 0) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: "No recipients" }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError("No recipients to send to.");
  }

  const { error: insertError } = await sbService.from("outbound_messages").insert(rows);
  if (insertError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: insertError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to queue messages: ${insertError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, queued: rows.length }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "WhatsApp Messages Queued",
    summary: `${rows.length} WhatsApp message${rows.length !== 1 ? "s" : ""} queued using template "${d.template_name}".`,
  }));

  return success({ type: "whatsapp_messages_queued", count: rows.length });
}

export async function createNotificationRuleDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "notifications");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  if (!args.event_type) return capabilityError("event_type is required.");
  if (!args.channel) return capabilityError("channel is required (e.g. whatsapp, push, email).");

  const draft = {
    event_type: args.event_type,
    channel: args.channel,
    target_roles: args.target_roles || [],
    throttle_max_per_day: args.throttle_max_per_day ?? 20,
    escalation_after_minutes: args.escalation_after_minutes ?? null,
    escalation_channel: args.escalation_channel ?? null,
    is_active: true,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "create_notification_rule", risk_level: "medium",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id,
    action_name: "create_notification_rule",
    risk_level: "medium",
    title: "Create Notification Rule",
    summary: `When **${args.event_type}** occurs → send via **${args.channel}**${draft.target_roles.length > 0 ? ` to ${draft.target_roles.join(", ")}` : ""}.${draft.escalation_after_minutes ? ` Escalates via ${draft.escalation_channel} after ${draft.escalation_after_minutes}min.` : ""}`,
    fields: [
      { label: "Event", value: args.event_type },
      { label: "Channel", value: args.channel },
      ...(draft.target_roles.length > 0 ? [{ label: "Target Roles", value: draft.target_roles.join(", ") }] : []),
      { label: "Max Per Day", value: String(draft.throttle_max_per_day) },
      ...(draft.escalation_after_minutes ? [
        { label: "Escalation After", value: `${draft.escalation_after_minutes} min` },
        { label: "Escalation Channel", value: draft.escalation_channel },
      ] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeCreateNotificationRule(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "notifications");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: rule, error: ruleError } = await sbService.from("notification_rules").insert({
    company_id: companyId,
    event_type: d.event_type,
    channel: d.channel,
    target_roles: d.target_roles || [],
    throttle_max_per_day: d.throttle_max_per_day ?? 20,
    escalation_after_minutes: d.escalation_after_minutes ?? null,
    escalation_channel: d.escalation_channel ?? null,
    is_active: true,
    created_by: userId,
  }).select("id").single();

  if (ruleError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: ruleError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to create notification rule: ${ruleError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, rule_id: rule.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Notification Rule Created",
    summary: `Rule created: when "${d.event_type}" occurs → ${d.channel}.`,
  }));

  return success({ type: "notification_rule_created", rule_id: rule.id });
}
