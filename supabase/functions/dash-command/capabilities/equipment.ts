/**
 * Equipment Management Capability Module
 * Phase 3: Equipment module (separate from CMMS).
 * Tables: equipment, equipment_interventions, equipment_documents, equipment_status_history
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

const VALID_EQUIPMENT_STATUSES = ["active", "inactive", "maintenance", "retired"];
const VALID_INTERVENTION_TYPES = ["check", "repair", "replacement", "calibration", "cleaning", "other"];

// ─── Read Tools ───

export async function listEquipment(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id;
  }

  let q = sb.from("equipment")
    .select("id, name, model_type, power_supply_type, status, last_check_date, next_check_date, location_id, locations(name), created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.status) q = q.eq("status", args.status);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    equipment: (data || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      model_type: e.model_type,
      power_supply_type: e.power_supply_type,
      status: e.status,
      location: e.locations?.name,
      last_check_date: e.last_check_date,
      next_check_date: e.next_check_date,
    })),
  });
}

export async function getEquipmentDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let equipId = args.equipment_id || null;

  if (!equipId && args.equipment_name) {
    const { data: eq } = await sb.from("equipment")
      .select("id").eq("company_id", companyId)
      .ilike("name", `%${args.equipment_name}%`).limit(1).maybeSingle();
    if (!eq) return capabilityError(`No equipment matching "${args.equipment_name}".`);
    equipId = eq.id;
  }

  if (!equipId) return capabilityError("Provide equipment_id or equipment_name.");

  const { data: eq, error } = await sb.from("equipment")
    .select("id, name, model_type, power_supply_type, status, last_check_date, next_check_date, location_id, locations(name), created_at")
    .eq("id", equipId).eq("company_id", companyId).maybeSingle();
  if (error) return capabilityError(error.message);
  if (!eq) return capabilityError("Equipment not found.");

  // Intervention history
  const { data: interventions } = await sb.from("equipment_interventions")
    .select("id, intervention_type, description, cost, performed_by, performed_at, created_at")
    .eq("equipment_id", equipId)
    .order("performed_at", { ascending: false })
    .limit(20);

  return success({
    id: eq.id,
    name: eq.name,
    model_type: eq.model_type,
    power_supply_type: eq.power_supply_type,
    status: eq.status,
    location: eq.locations?.name,
    last_check_date: eq.last_check_date,
    next_check_date: eq.next_check_date,
    interventions: (interventions || []).map((i: any) => ({
      id: i.id,
      type: i.intervention_type,
      description: i.description,
      cost: i.cost,
      performed_by: i.performed_by,
      performed_at: i.performed_at,
    })),
    intervention_count: interventions?.length ?? 0,
  });
}

export async function getEquipmentExpiries(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const daysAhead = args.days_ahead ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  let q = sb.from("equipment")
    .select("id, name, model_type, status, next_check_date, location_id, locations(name)")
    .eq("company_id", companyId)
    .not("next_check_date", "is", null)
    .lte("next_check_date", cutoff.toISOString().split("T")[0])
    .order("next_check_date", { ascending: true })
    .limit(100);

  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) q = q.eq("location_id", loc.id);
  }

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const today = new Date().toISOString().split("T")[0];
  return success({
    days_ahead: daysAhead,
    total: data?.length ?? 0,
    equipment: (data || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      model_type: e.model_type,
      location: e.locations?.name,
      next_check_date: e.next_check_date,
      overdue: e.next_check_date < today,
    })),
  });
}

// ─── Write Tools ───

export async function logEquipmentInterventionDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "equipment_management");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  // Resolve equipment
  let equipId = args.equipment_id || null;
  let equipName = args.equipment_name || null;

  if (!equipId && equipName) {
    const { data: eq } = await sb.from("equipment")
      .select("id, name").eq("company_id", companyId)
      .ilike("name", `%${equipName}%`).limit(1).maybeSingle();
    if (!eq) return capabilityError(`No equipment matching "${equipName}".`);
    equipId = eq.id;
    equipName = eq.name;
  }

  if (!equipId) return capabilityError("Provide equipment_id or equipment_name.");

  const interventionType = args.intervention_type || "check";
  if (!VALID_INTERVENTION_TYPES.includes(interventionType)) {
    return capabilityError(`Invalid intervention_type. Valid values: ${VALID_INTERVENTION_TYPES.join(", ")}`);
  }

  if (!args.description) return capabilityError("description is required.");

  const performedAt = args.performed_at || new Date().toISOString();
  const newStatus = VALID_EQUIPMENT_STATUSES.includes(args.new_status) ? args.new_status : null;

  const draft = {
    equipment_id: equipId,
    equipment_name: equipName,
    intervention_type: interventionType,
    description: args.description,
    cost: args.cost ?? null,
    performed_by: args.performed_by ?? null,
    performed_at: performedAt,
    new_status: newStatus,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "log_equipment_intervention", risk_level: "medium",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id,
    action_name: "log_equipment_intervention",
    risk_level: "medium",
    title: "Log Equipment Intervention",
    summary: `Log a **${interventionType}** on **${equipName}** performed on ${performedAt.split("T")[0]}.${newStatus ? ` Status will be updated to "${newStatus}".` : ""}`,
    fields: [
      { label: "Equipment", value: equipName },
      { label: "Type", value: interventionType },
      { label: "Description", value: args.description },
      ...(args.cost != null ? [{ label: "Cost", value: String(args.cost) }] : []),
      { label: "Performed At", value: performedAt.split("T")[0] },
      ...(newStatus ? [{ label: "New Status", value: newStatus }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeEquipmentIntervention(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "equipment_management");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: intervention, error: intError } = await sbService.from("equipment_interventions").insert({
    equipment_id: d.equipment_id,
    intervention_type: d.intervention_type,
    description: d.description,
    cost: d.cost ?? null,
    performed_by: d.performed_by ?? null,
    performed_at: d.performed_at,
    created_by: userId,
  }).select("id").single();

  if (intError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: intError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to log intervention: ${intError.message}`);
  }

  // Update equipment status and last_check_date if applicable
  const equipUpdate: any = { last_check_date: d.performed_at?.split("T")[0] ?? new Date().toISOString().split("T")[0] };
  if (d.new_status) equipUpdate.status = d.new_status;

  await sbService.from("equipment").update(equipUpdate).eq("id", d.equipment_id);

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, intervention_id: intervention.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Intervention Logged",
    summary: `${d.intervention_type} logged for "${d.equipment_name}" on ${d.performed_at?.split("T")[0]}.`,
  }));

  return success({ type: "equipment_intervention_logged", intervention_id: intervention.id });
}
