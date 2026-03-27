/**
 * Audits Capability Module
 * Migrated from index.ts — all audit domain logic lives here.
 * Phase 8: Standardized on CapabilityResult + permission enforcement.
 */
import { AUDIT_FINISHED_STATUSES } from "../shared/constants.ts";
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function getAuditResults(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 20, 200);
  let q = sb.from("location_audits").select("id, overall_score, status, audit_date, location_id, locations(name), template_id, audit_templates(name)")
    .eq("company_id", companyId).in("status", AUDIT_FINISHED_STATUSES).gte("audit_date", args.from).lte("audit_date", args.to).order("audit_date", { ascending: false }).limit(limit);
  if (args.location_id) q = q.eq("location_id", args.location_id);
  if (args.template_id) q = q.eq("template_id", args.template_id);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  const audits = c.items.map((a: any) => ({ id: a.id, score: a.overall_score, status: a.status, audit_date: a.audit_date, location: a.locations?.name, template: a.audit_templates?.name }));
  if (audits.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: `Audit Results (${args.from} — ${args.to})`,
      columns: ["Date", "Location", "Template", "Score", "Status"],
      rows: audits.map((a: any) => [a.audit_date, a.location ?? "—", a.template ?? "—", a.score ?? "—", a.status]),
    }));
  }
  return success({ audits, total: c.total, returned: c.returned, truncated: c.truncated });
}

export async function compareLocationPerformance(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  let locationIds: string[] = args.location_ids ?? [];
  if (locationIds.length === 0) {
    const { data: allLocs } = await sb.from("locations").select("id").eq("status", "active").eq("company_id", companyId).limit(100);
    locationIds = (allLocs ?? []).map((l: any) => l.id);
  }
  if (locationIds.length === 0) return capabilityError("No active locations found for your company.");

  const results: any[] = [];
  const noDataLocations: string[] = [];
  for (const locId of locationIds) {
    const { data } = await sb.from("location_audits").select("overall_score, locations(name)").eq("location_id", locId).in("status", AUDIT_FINISHED_STATUSES).gte("audit_date", args.from).lte("audit_date", args.to);
    const scores = (data ?? []).map((a: any) => a.overall_score).filter((s: any) => s != null && s > 0);
    const locName = data?.[0]?.locations?.name ?? locId;
    if (scores.length === 0) {
      noDataLocations.push(locName);
    } else {
      results.push({ location_id: locId, location_name: locName, audit_count: scores.length, avg_score: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length), min_score: Math.min(...scores), max_score: Math.max(...scores) });
    }
  }
  results.sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
  if (results.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: `Location Audit Comparison (${args.from} — ${args.to})`,
      columns: ["Location", "Avg Score", "Audits", "Min", "Max"],
      rows: results.map((r: any) => [r.location_name, r.avg_score, r.audit_count, r.min_score, r.max_score]),
    }));
  }
  return success({ date_range: { from: args.from, to: args.to }, comparisons: results, locations_with_no_scored_audits: noDataLocations });
}

// ─── Draft Tools ───

export async function createAuditTemplateDraft(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;

  const sectionCount = args.sections?.length || 0;
  const fieldCount = args.sections?.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0) || 0;

  const draft = {
    name: args.template_name,
    description: args.description || null,
    sections: args.sections,
    recurrence: args.recurrence || "none",
    target_locations: args.target_locations || "all",
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId,
    user_id: userId,
    action_name: "create_audit_template",
    action_type: "write",
    risk_level: "medium",
    preview_json: draft,
    status: "pending",
  }).select("id").single();
  const pendingActionId = paData?.id || null;

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Audit Template",
    summary: `"${args.template_name}" with ${sectionCount} sections, ${fieldCount} fields. Recurrence: ${args.recurrence || "none"}`,
    risk: "medium",
    affected: [`${sectionCount} sections`, `${fieldCount} fields`, args.recurrence || "no recurrence"],
    pending_action_id: pendingActionId,
    draft,
    can_approve: true,
  }));

  return success({
    type: "audit_template_draft",
    draft,
    pending_action_id: pendingActionId,
    summary: { sections: sectionCount, total_fields: fieldCount, recurrence: args.recurrence || "none", target: args.target_locations || "all locations" },
    requires_approval: true,
    risk_level: "medium",
    message: `Audit template "${args.template_name}" draft ready (ID: ${pendingActionId}). User can approve to create.`,
  });
}

// ─── Execute Tools ───

export async function executeAuditTemplateCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  hydrateArgsFromDraft: (actionName: string, previewJson: any) => Record<string, any>,
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;

  let templateName = args.template_name;
  let templateDescription = args.description;
  let templateSections = args.sections;

  if (args.pending_action_id) {
    const { data: pa } = await sbService.from("dash_pending_actions")
      .select("id, status, company_id, preview_json")
      .eq("id", args.pending_action_id)
      .maybeSingle();
    if (pa && pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
    if (pa && pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

    if (pa?.preview_json && (!templateName || !templateSections)) {
      const preview = pa.preview_json as any;
      templateName = templateName || preview.name || preview.template_name;
      templateDescription = templateDescription || preview.description;
      templateSections = templateSections || preview.sections;
    }
  }

  if (!templateName) {
    return capabilityError("Template name is required but was not provided.");
  }

  const { data: tmplData, error: tmplError } = await sbService.from("audit_templates").insert({
    company_id: companyId,
    name: templateName,
    description: templateDescription || null,
    template_type: "location",
    is_active: true,
    is_global: true,
    created_by: userId,
  }).select("id, name").single();

  if (tmplError) {
    if (args.pending_action_id) {
      await sbService.from("dash_pending_actions")
        .update({ status: "failed", execution_result: { error: tmplError.message }, updated_at: new Date().toISOString() })
        .eq("id", args.pending_action_id);
    }
    structuredEvents.push(makeStructuredEvent("execution_result", {
      status: "error",
      title: "Template Creation Failed",
      summary: tmplError.message,
      errors: [tmplError.message],
    }));
    return capabilityError(`Failed to create template: ${tmplError.message}`);
  }

  let sectionErrors: string[] = [];
  for (let si = 0; si < (templateSections || []).length; si++) {
    const sec = templateSections[si];
    const { data: secData, error: secError } = await sbService.from("audit_sections").insert({
      template_id: tmplData.id,
      name: sec.name,
      display_order: si + 1,
    }).select("id").single();

    if (secError) {
      sectionErrors.push(`Section "${sec.name}": ${secError.message}`);
      continue;
    }

    for (let fi = 0; fi < (sec.fields || []).length; fi++) {
      const fld = sec.fields[fi];
      await sbService.from("audit_fields").insert({
        section_id: secData.id,
        name: fld.name,
        field_type: fld.field_type || "yes_no",
        is_required: fld.is_required ?? true,
        display_order: fi + 1,
      });
    }
  }

  if (args.pending_action_id) {
    await sbService.from("dash_pending_actions")
      .update({
        status: "executed",
        approved_at: new Date().toISOString(),
        approved_by: userId,
        execution_result: { template_id: tmplData.id, template_name: tmplData.name, section_errors: sectionErrors },
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.pending_action_id);
  }

  await logCapabilityAction(sbService, {
    companyId, userId, capability: "audits.create_template", actionType: "write",
    riskLevel: "medium", request: args, result: { template_id: tmplData.id },
    entitiesAffected: [tmplData.id], module: "location_audits",
  });

  const resultStatus = sectionErrors.length > 0 ? "partial" : "success";
  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: resultStatus,
    title: resultStatus === "success" ? "Audit Template Created" : "Template Created with Warnings",
    summary: `Template "${tmplData.name}" created successfully. ${sectionErrors.length > 0 ? `${sectionErrors.length} section errors.` : "All sections and fields added. You can find it in Audit Templates."}`,
    changes: [`Template "${tmplData.name}" created`, `${(templateSections || []).length} sections added`],
    errors: sectionErrors.length > 0 ? sectionErrors : undefined,
  }));

  return success({
    type: "audit_template_created",
    template_id: tmplData.id,
    template_name: tmplData.name,
    section_errors: sectionErrors,
    message: `Audit template "${tmplData.name}" created successfully! ${sectionErrors.length > 0 ? `${sectionErrors.length} issues with sections.` : "You can find it in Audit Templates."}`,
  });
}

// ─── Scheduled Audits ───

export async function listScheduledAudits(
  sb: any, companyId: string, args: any, structuredEvents: string[]
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 20, 200);
  let q = sb.from("scheduled_audits")
    .select("id, scheduled_for, status, frequency, template_id, audit_templates!inner(name, company_id), location_id, locations(name)")
    .eq("audit_templates.company_id", companyId)
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (args.status) q = q.eq("status", args.status);
  if (args.from) q = q.gte("scheduled_for", args.from);
  if (args.to) q = q.lte("scheduled_for", args.to);
  if (args.location_name) q = q.ilike("locations.name", `%${args.location_name}%`);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const c = cap(data, limit);
  const scheduled_audits = c.items.map((r: any) => ({
    id: r.id,
    template_name: r.audit_templates?.name,
    location_name: r.locations?.name,
    scheduled_for: r.scheduled_for,
    status: r.status,
    frequency: r.frequency,
  }));
  if (scheduled_audits.length > 0) {
    structuredEvents.push(makeStructuredEvent("data_table", {
      title: "Scheduled Audits",
      columns: ["Template", "Location", "Scheduled For", "Status", "Frequency"],
      rows: scheduled_audits.map((r: any) => [r.template_name ?? "—", r.location_name ?? "—", r.scheduled_for, r.status, r.frequency ?? "—"]),
    }));
  }
  return success({ count: c.total, scheduled_audits });
}

export async function scheduleAuditDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve template
  let templateId = args.template_id || null;
  let templateName = args.template_name || null;
  if (templateName && !templateId) {
    const { data } = await sb.from("audit_templates").select("id, name").eq("company_id", companyId).ilike("name", `%${templateName}%`).limit(1);
    if (data?.[0]) { templateId = data[0].id; templateName = data[0].name; }
  } else if (templateId && !templateName) {
    const { data } = await sb.from("audit_templates").select("id, name").eq("id", templateId).eq("company_id", companyId).maybeSingle();
    if (data) templateName = data.name;
  }

  // Resolve location
  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (locationName && !locationId) {
    const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1);
    if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
  } else if (locationId && !locationName) {
    const { data } = await sb.from("locations").select("id, name").eq("id", locationId).eq("company_id", companyId).maybeSingle();
    if (data) locationName = data.name;
  }

  const missing: string[] = [];
  if (!templateId) missing.push("template");
  if (!locationId) missing.push("location");

  const draft = {
    template_id: templateId, template_name: templateName,
    location_id: locationId, location_name: locationName,
    scheduled_for: args.scheduled_for, frequency: args.frequency || null,
    assignee_name: args.assignee_name || null,
  };

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId, user_id: userId,
      action_name: "schedule_audit", action_type: "write",
      risk_level: "medium", preview_json: draft, status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Schedule Audit",
    summary: `Schedule "${templateName || "?"}" audit at ${locationName || "?"} on ${args.scheduled_for}`,
    risk: "medium",
    affected: [templateName, locationName].filter(Boolean),
    pending_action_id: pendingActionId,
    draft,
    missing_fields: missing,
    can_approve: missing.length === 0,
  }));

  return success({
    type: "schedule_audit_draft", draft, missing_fields: missing,
    pending_action_id: pendingActionId, requires_approval: true, risk_level: "medium",
    message: missing.length > 0 ? `Draft missing: ${missing.join(", ")}` : `Schedule audit draft ready.`,
  });
}

export async function executeAuditScheduling(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");

  const d = pa.preview_json;
  const { data, error } = await sbService.from("scheduled_audits").insert({
    template_id: d.template_id,
    location_id: d.location_id,
    scheduled_for: d.scheduled_for,
    frequency: d.frequency || null,
    status: "scheduled",
    created_by: userId,
  }).select("id").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_by: userId, approved_at: new Date().toISOString(),
    execution_result: { id: data.id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    company_id: companyId, user_id: userId, action_type: "write",
    action_name: "schedule_audit", risk_level: "medium", status: "success",
    approval_status: "approved", modules_touched: ["location_audits"], result_json: { id: data.id },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Audit Scheduled",
    summary: `"${d.template_name}" scheduled at ${d.location_name} on ${d.scheduled_for}.`,
    changes: [`Scheduled: ${d.template_name} at ${d.location_name}`],
  }));

  return success({ id: data.id });
}

export async function cancelScheduledAuditDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: sa } = await sb.from("scheduled_audits")
    .select("id, scheduled_for, status, frequency, audit_templates(name, company_id), locations(name)")
    .eq("id", args.scheduled_audit_id).maybeSingle();
  if (!sa) return capabilityError("Scheduled audit not found.");
  if (sa.audit_templates?.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (sa.status === "cancelled") return capabilityError("This scheduled audit is already cancelled.");

  const draft = {
    scheduled_audit_id: sa.id,
    template_name: sa.audit_templates?.name,
    location_name: sa.locations?.name,
    scheduled_for: sa.scheduled_for,
    current_status: sa.status,
    reason: args.reason || null,
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId,
    action_name: "cancel_scheduled_audit", action_type: "write",
    risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Cancel Scheduled Audit",
    summary: `Cancel "${draft.template_name}" at ${draft.location_name} on ${draft.scheduled_for}.${args.reason ? ` Reason: ${args.reason}` : ""}`,
    risk: "medium",
    affected: [draft.template_name, draft.location_name].filter(Boolean),
    pending_action_id: paData?.id,
    draft,
    missing_fields: [],
    can_approve: true,
  }));

  return success({
    type: "cancel_scheduled_audit_draft", draft,
    pending_action_id: paData?.id, requires_approval: true, risk_level: "medium",
    message: `Cancel draft ready for "${draft.template_name}" on ${draft.scheduled_for}.`,
  });
}

export async function executeCancelScheduledAudit(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "location_audits", ctx });
  if (!permCheck.ok) return permCheck;
  if (!args.pending_action_id) return capabilityError("Missing pending_action_id.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id).maybeSingle();
  if (!pa || pa.company_id !== companyId || pa.status !== "pending")
    return capabilityError("Pending action not found or already processed.");

  const d = pa.preview_json;
  const { error } = await sbService.from("scheduled_audits")
    .update({ status: "cancelled" })
    .eq("id", d.scheduled_audit_id);

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_by: userId, approved_at: new Date().toISOString(),
    execution_result: { id: d.scheduled_audit_id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    company_id: companyId, user_id: userId, action_type: "write",
    action_name: "cancel_scheduled_audit", risk_level: "medium", status: "success",
    approval_status: "approved", modules_touched: ["location_audits"], result_json: { id: d.scheduled_audit_id },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Scheduled Audit Cancelled",
    summary: `"${d.template_name}" at ${d.location_name} on ${d.scheduled_for} has been cancelled.`,
    changes: [`Cancelled: ${d.template_name} on ${d.scheduled_for}`],
  }));

  return success({ id: d.scheduled_audit_id });
}
