/**
 * Inventory Management Capability Module
 * Phase 4: inventory_items, inventory_snapshots, manual_metrics
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

// ─── Read Tools ───

export async function getInventoryLevels(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id;
  }

  let q = sb.from("inventory_items")
    .select("id, name, sku, quantity, unit_cost, status, location_id, locations(name)")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(200);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.status) q = q.eq("status", args.status);
  else q = q.eq("status", "active");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const items = data || [];
  const totalValue = items.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unit_cost || 0)), 0);

  return success({
    total_items: items.length,
    total_value: totalValue,
    items: items.map((i: any) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      location: i.locations?.name,
      status: i.status,
    })),
  });
}

export async function listManualMetrics(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 100, 500);

  let q = sb.from("manual_metrics")
    .select("id, metric_name, metric_value, metric_date, location_id, locations(name), notes")
    .eq("company_id", companyId)
    .order("metric_date", { ascending: false })
    .limit(limit);

  if (args.metric_name) q = q.ilike("metric_name", `%${args.metric_name}%`);
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) q = q.eq("location_id", loc.id);
  }
  if (args.from) q = q.gte("metric_date", args.from);
  if (args.to) q = q.lte("metric_date", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  // Group by metric_name for summary
  const byMetric: Record<string, any[]> = {};
  for (const m of data || []) {
    if (!byMetric[m.metric_name]) byMetric[m.metric_name] = [];
    byMetric[m.metric_name].push(m);
  }

  const metrics = Object.entries(byMetric).map(([name, rows]) => {
    const vals = rows.map((r: any) => r.metric_value).filter((v: any) => v != null);
    const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    const latest = rows[0];
    return {
      metric_name: name,
      latest_value: latest.metric_value,
      latest_date: latest.metric_date,
      latest_location: latest.locations?.name,
      avg_value: avg != null ? Math.round(avg * 100) / 100 : null,
      entry_count: rows.length,
    };
  });

  return success({
    total_entries: data?.length ?? 0,
    distinct_metrics: metrics.length,
    metrics,
    raw_entries: args.include_raw ? (data || []).map((m: any) => ({
      metric_name: m.metric_name,
      value: m.metric_value,
      date: m.metric_date,
      location: m.locations?.name,
      notes: m.notes,
    })) : undefined,
  });
}

// ─── Write Tools ───

export async function logMetricDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  if (!args.metric_name) return capabilityError("metric_name is required.");
  if (args.metric_value == null) return capabilityError("metric_value is required.");

  let locationId: string | null = null;
  let locationName: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id, name")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id; locationName = loc.name;
  }

  const metricDate = args.metric_date || new Date().toISOString().split("T")[0];

  const draft = {
    metric_name: args.metric_name,
    metric_value: args.metric_value,
    metric_date: metricDate,
    location_id: locationId,
    location_name: locationName,
    notes: args.notes || null,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "log_metric", risk_level: "low",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id, action_name: "log_metric", risk_level: "low",
    title: "Log Metric",
    summary: `Record **${args.metric_name}** = **${args.metric_value}** on ${metricDate}${locationName ? ` at ${locationName}` : ""}.`,
    fields: [
      { label: "Metric", value: args.metric_name },
      { label: "Value", value: String(args.metric_value) },
      { label: "Date", value: metricDate },
      ...(locationName ? [{ label: "Location", value: locationName }] : []),
      ...(args.notes ? [{ label: "Notes", value: args.notes }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeLogMetric(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "workforce", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const { data: metric, error: metricError } = await sbService.from("manual_metrics").insert({
    company_id: companyId,
    metric_name: d.metric_name,
    metric_value: d.metric_value,
    metric_date: d.metric_date,
    location_id: d.location_id || null,
    notes: d.notes || null,
    created_by: userId,
  }).select("id").single();

  if (metricError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: metricError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to log metric: ${metricError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, metric_id: metric.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Metric Logged",
    summary: `${d.metric_name} = ${d.metric_value} recorded for ${d.metric_date}.`,
  }));

  return success({ type: "metric_logged", metric_id: metric.id });
}
