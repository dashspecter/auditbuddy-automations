/**
 * Waste Management Capability Module
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

// ─── Read Tools ───

export async function getWasteReport(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Resolve location(s)
  let locationIds: string[] | null = null;
  if (args.location_name) {
    const { data: locs } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(5);
    if (!locs?.length) return capabilityError(`No location matching "${args.location_name}".`);
    locationIds = locs.map((l: any) => l.id);
  } else {
    const { data: locs } = await sb.from("locations").select("id").eq("company_id", companyId).eq("status", "active");
    locationIds = (locs || []).map((l: any) => l.id);
  }

  if (!locationIds?.length) return success({ kpis: { total_weight_kg: 0, total_cost: 0, entry_count: 0 }, by_product: [], by_category: [] });

  // Query waste entries in range
  let q = sb.from("waste_entries")
    .select("id, weight_g, cost_total, occurred_at, location_id, locations(name), waste_product_id, waste_products(name, category), waste_reason_id, waste_reasons(name), status")
    .eq("company_id", companyId)
    .eq("status", "recorded")
    .in("location_id", locationIds)
    .order("occurred_at", { ascending: false })
    .limit(500);

  if (args.from) q = q.gte("occurred_at", args.from);
  if (args.to) q = q.lte("occurred_at", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  // Aggregate in JS
  const entries = data || [];
  const totalWeightG = entries.reduce((s: number, e: any) => s + (e.weight_g || 0), 0);
  const totalCost = entries.reduce((s: number, e: any) => s + (e.cost_total || 0), 0);

  // By product
  const byProduct: Record<string, any> = {};
  for (const e of entries) {
    const key = e.waste_products?.name || "Unknown";
    if (!byProduct[key]) byProduct[key] = { name: key, category: e.waste_products?.category, weight_g: 0, cost: 0, count: 0 };
    byProduct[key].weight_g += e.weight_g || 0;
    byProduct[key].cost += e.cost_total || 0;
    byProduct[key].count++;
  }

  // By category
  const byCat: Record<string, any> = {};
  for (const e of entries) {
    const key = e.waste_products?.category || "Uncategorized";
    if (!byCat[key]) byCat[key] = { category: key, weight_g: 0, cost: 0, count: 0 };
    byCat[key].weight_g += e.weight_g || 0;
    byCat[key].cost += e.cost_total || 0;
    byCat[key].count++;
  }

  const topProducts = Object.values(byProduct)
    .sort((a: any, b: any) => b.weight_g - a.weight_g)
    .slice(0, 10)
    .map((p: any) => ({ ...p, weight_kg: +(p.weight_g / 1000).toFixed(3) }));

  const byCategory = Object.values(byCat)
    .sort((a: any, b: any) => b.weight_g - a.weight_g)
    .map((c: any) => ({ ...c, weight_kg: +(c.weight_g / 1000).toFixed(3) }));

  return success({
    date_range: { from: args.from || null, to: args.to || null },
    kpis: {
      total_weight_kg: +(totalWeightG / 1000).toFixed(3),
      total_cost: +totalCost.toFixed(2),
      entry_count: entries.length,
    },
    top_products: topProducts,
    by_category: byCategory,
  });
}

export async function listWasteEntries(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) locationId = loc.id;
  }

  let q = sb.from("waste_entries")
    .select("id, weight_g, cost_total, occurred_at, notes, status, location_id, locations(name), waste_products(name, category), waste_reasons(name)")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.status) q = q.eq("status", args.status);
  else q = q.eq("status", "recorded");
  if (args.from) q = q.gte("occurred_at", args.from);
  if (args.to) q = q.lte("occurred_at", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    entries: (data || []).map((e: any) => ({
      id: e.id,
      product: e.waste_products?.name,
      category: e.waste_products?.category,
      reason: e.waste_reasons?.name,
      weight_kg: e.weight_g ? +(e.weight_g / 1000).toFixed(3) : null,
      cost: e.cost_total,
      location: e.locations?.name,
      occurred_at: e.occurred_at,
      notes: e.notes,
      status: e.status,
    })),
  });
}

export async function listWasteProducts(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("waste_products")
    .select("id, name, category, uom, cost_model, unit_cost, active")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("category", { ascending: true });

  if (error) return capabilityError(error.message);
  return success({ total: data?.length ?? 0, products: data || [] });
}

// ─── Write Tools ───

export async function logWasteDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "waste", ctx });
  if (!permCheck.ok) return permCheck;

  // Resolve product
  let productId = args.product_id || null;
  let productName = args.product_name || null;
  let unitCost: number | null = null;
  if (!productId && productName) {
    const { data: prods } = await sb.from("waste_products").select("id, name, unit_cost, cost_model, uom").eq("company_id", companyId).ilike("name", `%${productName}%`).eq("active", true).limit(5);
    if (!prods?.length) return capabilityError(`No waste product matching "${productName}".`);
    if (prods.length > 1) return capabilityError(`Multiple products match "${productName}": ${prods.map((p: any) => p.name).join(", ")}.`);
    productId = prods[0].id; productName = prods[0].name; unitCost = prods[0].unit_cost;
  }

  // Resolve reason
  let reasonId = args.reason_id || null;
  let reasonName = args.reason_name || null;
  if (!reasonId && reasonName) {
    const { data: reasons } = await sb.from("waste_reasons").select("id, name").eq("company_id", companyId).ilike("name", `%${reasonName}%`).limit(1).maybeSingle();
    if (reasons) { reasonId = reasons.id; reasonName = reasons.name; }
  }

  // Resolve location
  let locationId = args.location_id || null;
  let locationName = args.location_name || null;
  if (!locationId && locationName) {
    const { data: loc } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${locationName}".`);
    locationId = loc.id; locationName = loc.name;
  }

  // Convert weight: accept grams or kg
  let weightG: number | null = null;
  if (args.weight_g) weightG = args.weight_g;
  else if (args.weight_kg) weightG = args.weight_kg * 1000;
  if (!weightG || weightG <= 0) return capabilityError("Weight is required (weight_g in grams or weight_kg in kg).");

  const estimatedCost = unitCost ? +(weightG / 1000 * unitCost).toFixed(2) : null;

  const draft = {
    waste_product_id: productId,
    product_name: productName,
    waste_reason_id: reasonId,
    reason_name: reasonName,
    location_id: locationId,
    location_name: locationName,
    weight_g: weightG,
    notes: args.notes || null,
    occurred_at: args.occurred_at || new Date().toISOString(),
    estimated_cost: estimatedCost,
  };

  const missing: string[] = [];
  if (!productId) missing.push("product_name");
  if (!locationId) missing.push("location");

  if (missing.length > 0) return capabilityError(`Missing required fields: ${missing.join(", ")}.`);

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId, action_name: "log_waste",
    action_type: "write", risk_level: "medium", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: "Log Waste Entry",
    summary: `${+(weightG / 1000).toFixed(3)} kg of "${productName}" at ${locationName}${reasonName ? ` (${reasonName})` : ""}${estimatedCost ? ` — est. cost: ${estimatedCost} RON` : ""}`,
    risk: "medium",
    affected: [productName, locationName].filter(Boolean),
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "waste_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeWasteEntry(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "create", module: "waste", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const { data: entry, error } = await sbService.from("waste_entries").insert({
    company_id: companyId,
    location_id: d.location_id,
    created_by: userId,
    waste_product_id: d.waste_product_id,
    waste_reason_id: d.waste_reason_id || null,
    weight_g: d.weight_g,
    notes: d.notes || null,
    occurred_at: d.occurred_at,
    status: "recorded",
  }).select("id").single();

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to log waste: ${error.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, entry_id: entry.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Waste Entry Logged",
    summary: `${+(d.weight_g / 1000).toFixed(3)} kg of "${d.product_name}" recorded at ${d.location_name}.`,
  }));

  return success({ type: "waste_logged", entry_id: entry.id });
}
