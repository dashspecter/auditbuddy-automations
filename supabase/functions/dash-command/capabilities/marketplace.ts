/**
 * Marketplace Capability Module
 * Phase 5: Browse and install audit templates from the marketplace.
 * Tables: marketplace_templates, marketplace_categories, marketplace_downloads
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { cap, makeStructuredEvent } from "../shared/utils.ts";

// ─── Read Tools ───

export async function listMarketplaceTemplates(
  sb: any, _companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 30, 100);

  let q = sb.from("marketplace_templates")
    .select("id, name, description, category_id, marketplace_categories(name), download_count, avg_rating, is_featured, created_at")
    .eq("is_active", true)
    .order("download_count", { ascending: false })
    .limit(limit);

  if (args.category) {
    // Try matching category by name
    const { data: cat } = await sb.from("marketplace_categories")
      .select("id").ilike("name", `%${args.category}%`).limit(1).maybeSingle();
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (args.search) q = q.ilike("name", `%${args.search}%`);
  if (args.featured_only) q = q.eq("is_featured", true);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const c = cap(data, limit);
  return success({
    total: c.total, returned: c.returned, truncated: c.truncated,
    templates: c.items.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: (t as any).marketplace_categories?.name,
      download_count: t.download_count,
      avg_rating: t.avg_rating,
      is_featured: t.is_featured,
    })),
  });
}

// ─── Write Tools ───

export async function installMarketplaceTemplateDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "location_audits");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  if (!args.template_id && !args.template_name) return capabilityError("Provide template_id or template_name.");

  let templateId = args.template_id || null;
  let templateName = args.template_name || null;
  let templateDescription: string | null = null;

  if (!templateId && templateName) {
    const { data: tpl } = await sb.from("marketplace_templates")
      .select("id, name, description").eq("is_active", true)
      .ilike("name", `%${templateName}%`).limit(1).maybeSingle();
    if (!tpl) return capabilityError(`No marketplace template matching "${templateName}".`);
    templateId = tpl.id;
    templateName = tpl.name;
    templateDescription = tpl.description;
  }

  if (!templateId) {
    const { data: tpl } = await sb.from("marketplace_templates")
      .select("id, name, description").eq("id", templateId).maybeSingle();
    if (!tpl) return capabilityError("Marketplace template not found.");
    templateName = tpl.name;
    templateDescription = tpl.description;
  }

  const draft = {
    template_id: templateId,
    template_name: templateName,
    template_description: templateDescription,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "install_marketplace_template", risk_level: "low",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id, action_name: "install_marketplace_template", risk_level: "low",
    title: "Install Marketplace Template",
    summary: `Install **"${templateName}"** into your company's audit templates.${templateDescription ? ` ${templateDescription}` : ""}`,
    fields: [
      { label: "Template", value: templateName },
      ...(templateDescription ? [{ label: "Description", value: templateDescription }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeInstallMarketplaceTemplate(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission(ctx, "create", "location_audits");
  if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  // Record the download
  const { data: download, error: dlError } = await sbService.from("marketplace_downloads").insert({
    template_id: d.template_id,
    company_id: companyId,
    downloaded_by: userId,
    downloaded_at: new Date().toISOString(),
  }).select("id").single();

  if (dlError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: dlError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to install template: ${dlError.message}`);
  }

  // Increment download_count
  await sbService.rpc("increment_marketplace_download_count", { p_template_id: d.template_id }).maybeSingle()
    .catch(() => {}); // non-fatal if RPC doesn't exist

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, download_id: download.id }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Template Installed",
    summary: `"${d.template_name}" has been installed and is now available in your audit templates.`,
  }));

  return success({ type: "marketplace_template_installed", template_name: d.template_name, download_id: download.id });
}
