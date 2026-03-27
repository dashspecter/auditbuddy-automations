/**
 * Locations Capability Module
 * Handles listing, creating, updating, and deactivating company locations.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission, isManagerLevel } from "../shared/permissions.ts";
import { logCapabilityAction } from "../shared/logging.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";


// ─── Read Tools ───

export async function listLocations(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);
  let q = sb.from("locations")
    .select("id, name, address, city, type, status")
    .eq("company_id", companyId);
  if (args.status) q = q.eq("status", args.status);
  if (args.city) q = q.ilike("city", `%${args.city}%`);
  if (args.type) q = q.eq("type", args.type);
  q = q.order("name", { ascending: true }).limit(limit);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  const locations = data ?? [];
  return success({ count: locations.length, locations });
}

export async function getLocationDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let loc: any = null;
  if (args.location_id) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .eq("id", args.location_id)
      .maybeSingle();
    loc = data;
  } else if (args.location_name) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .ilike("name", `%${args.location_name}%`)
      .limit(1);
    loc = data?.[0] || null;
  }
  if (!loc) return capabilityError("Location not found.");
  const { count } = await sb.from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("location_id", loc.id)
    .eq("status", "active");
  return success({ ...loc, employee_count: count ?? 0 });
}


// ─── Draft Tools ───

export async function createLocationDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  const draft = {
    name: args.name || null,
    address: args.address || null,
    city: args.city || null,
    type: args.type || null,
  };

  const missing: string[] = [];
  if (!draft.name) missing.push("name");

  let pendingActionId: string | null = null;
  if (missing.length === 0) {
    const { data: paData } = await sbService.from("dash_pending_actions").insert({
      company_id: companyId,
      user_id: userId,
      action_name: "create_location",
      action_type: "write",
      risk_level: "medium",
      preview_json: draft,
      status: "pending",
    }).select("id").single();
    pendingActionId = paData?.id || null;
  }

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Create Location",
    summary: missing.length > 0
      ? `Draft for location — missing: ${missing.join(", ")}`
      : `Create location "${draft.name}"`,
    risk: "medium",
    affected: [draft.name, draft.city].filter(Boolean),
    pending_action_id: pendingActionId,
    draft,
    missing_fields: missing,
    can_approve: missing.length === 0,
  }));

  return success({
    type: "location_draft",
    draft,
    missing_fields: missing,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "medium",
    message: missing.length > 0
      ? `Draft created but missing: ${missing.join(", ")}. Please provide these to proceed.`
      : `Location draft ready for "${draft.name}". A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
  });
}

export async function executeLocationCreation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa || pa.company_id !== companyId || pa.status !== "pending") {
    return capabilityError("Pending action not found or already processed.");
  }

  const d = pa.preview_json;

  const { data, error } = await sbService.from("locations").insert({
    name: d.name,
    address: d.address || null,
    city: d.city || null,
    type: d.type || null,
    company_id: companyId,
    created_by: userId,
    status: "active",
  }).select("id, name").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed to create location: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    execution_result: { location_id: data.id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    companyId,
    userId,
    capability: "locations.create",
    actionType: "write",
    riskLevel: "medium",
    module: "locations",
    request: { name: d.name },
    result: { location_id: data.id, name: data.name },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Location Created",
    summary: `Location "${data.name}" has been created successfully.`,
    changes: [`Created location: ${data.name}`],
  }));

  return success({ location_id: data.id, name: data.name });
}


// ─── Update Location ───

export async function updateLocationDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  let loc: any = null;
  if (args.location_id) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .eq("id", args.location_id)
      .maybeSingle();
    loc = data;
  } else if (args.location_name) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .ilike("name", `%${args.location_name}%`)
      .limit(1);
    loc = data?.[0] || null;
  }

  if (!loc) return capabilityError("Location not found.");

  const changes: Record<string, any> = {};
  if (args.new_name !== undefined) changes.name = args.new_name;
  if (args.new_address !== undefined) changes.address = args.new_address;
  if (args.new_city !== undefined) changes.city = args.new_city;
  if (args.new_status !== undefined) changes.status = args.new_status;

  const draft = {
    location_id: loc.id,
    location_name: loc.name,
    changes,
  };

  const changeLines = Object.entries(changes).map(([k, v]) => `${k}: "${loc[k]}" → "${v}"`);
  const summary = `Update location "${loc.name}": ${changeLines.join(", ")}`;

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId,
    user_id: userId,
    action_name: "update_location",
    action_type: "write",
    risk_level: "medium",
    preview_json: draft,
    status: "pending",
  }).select("id").single();
  const pendingActionId = paData?.id || null;

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Update Location",
    summary,
    risk: "medium",
    affected: [loc.name],
    pending_action_id: pendingActionId,
    draft,
    missing_fields: [],
    can_approve: true,
  }));

  return success({
    type: "location_update_draft",
    draft,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "medium",
    message: `Location update draft ready for "${loc.name}". A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
  });
}

export async function executeLocationUpdate(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa || pa.company_id !== companyId || pa.status !== "pending") {
    return capabilityError("Pending action not found or already processed.");
  }

  const d = pa.preview_json;

  const { data, error } = await sbService.from("locations")
    .update(d.changes)
    .eq("id", d.location_id)
    .eq("company_id", companyId)
    .select("id, name")
    .single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed to update location: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    execution_result: { location_id: data.id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    companyId,
    userId,
    capability: "locations.update",
    actionType: "write",
    riskLevel: "medium",
    module: "locations",
    request: { location_id: d.location_id, changes: d.changes },
    result: { location_id: data.id, name: data.name },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Location Updated",
    summary: `Location "${data.name}" has been updated successfully.`,
    changes: Object.entries(d.changes).map(([k, v]) => `Updated ${k} to "${v}"`),
  }));

  return success({ location_id: data.id, name: data.name });
}


// ─── Deactivate Location ───

export async function deactivateLocationDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  let loc: any = null;
  if (args.location_id) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .eq("id", args.location_id)
      .maybeSingle();
    loc = data;
  } else if (args.location_name) {
    const { data } = await sb.from("locations")
      .select("id, name, address, city, type, status")
      .eq("company_id", companyId)
      .ilike("name", `%${args.location_name}%`)
      .limit(1);
    loc = data?.[0] || null;
  }

  if (!loc) return capabilityError("Location not found.");

  const { count: activeEmployeeCount } = await sb.from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("location_id", loc.id)
    .eq("status", "active");

  const employeeCount = activeEmployeeCount ?? 0;

  const draft = {
    location_id: loc.id,
    location_name: loc.name,
    reason: args.reason || null,
    active_employee_count: employeeCount,
  };

  const { data: paData } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId,
    user_id: userId,
    action_name: "deactivate_location",
    action_type: "write",
    risk_level: "high",
    preview_json: draft,
    status: "pending",
  }).select("id").single();
  const pendingActionId = paData?.id || null;

  const warning = employeeCount > 0 ? ` ⚠️ This location has ${employeeCount} active employees.` : "";
  const summary = `Deactivate location "${loc.name}".${warning}`;

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Deactivate Location",
    summary,
    risk: "high",
    affected: [loc.name],
    pending_action_id: pendingActionId,
    draft,
    missing_fields: [],
    can_approve: true,
  }));

  return success({
    type: "location_deactivation_draft",
    draft,
    pending_action_id: pendingActionId,
    requires_approval: true,
    risk_level: "high",
    active_employee_count: employeeCount,
    message: `Deactivation draft ready for "${loc.name}".${warning} A pending action has been created (ID: ${pendingActionId}). The user can approve to execute.`,
  });
}

export async function executeLocationDeactivation(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "locations", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("preview_json, company_id, status")
    .eq("id", args.pending_action_id)
    .maybeSingle();

  if (!pa || pa.company_id !== companyId || pa.status !== "pending") {
    return capabilityError("Pending action not found or already processed.");
  }

  const d = pa.preview_json;

  const { data, error } = await sbService.from("locations")
    .update({ status: "inactive" })
    .eq("id", d.location_id)
    .eq("company_id", companyId)
    .select("id, name")
    .single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed" }).eq("id", args.pending_action_id);
    return capabilityError(`Failed to deactivate location: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    execution_result: { location_id: data.id },
  }).eq("id", args.pending_action_id);

  await logCapabilityAction(sbService, {
    companyId,
    userId,
    capability: "locations.deactivate",
    actionType: "write",
    riskLevel: "high",
    module: "locations",
    request: { location_id: d.location_id, reason: d.reason },
    result: { location_id: data.id, name: data.name, status: "inactive" },
  });

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: "Location Deactivated",
    summary: `Location "${data.name}" has been deactivated successfully.`,
    changes: [`Deactivated location: ${data.name}`],
  }));

  return success({ location_id: data.id, name: data.name, status: "inactive" });
}
