/**
 * QR Forms / Digital Records Capability Module
 * Phase 3: Read-only access to form templates, assignments, and submissions.
 * Tables: form_templates, form_template_versions, location_form_templates, form_submissions
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { cap } from "../shared/utils.ts";

// ─── Read Tools ───

export async function listFormTemplates(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("form_templates")
    .select("id, name, category, type, is_active, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (args.is_active !== undefined) q = q.eq("is_active", args.is_active);
  if (args.type) q = q.eq("type", args.type);
  if (args.category) q = q.ilike("category", `%${args.category}%`);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const c = cap(data, limit);
  return success({
    total: c.total, returned: c.returned, truncated: c.truncated,
    templates: c.items.map((t: any) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      type: t.type,
      is_active: t.is_active,
    })),
  });
}

export async function listFormAssignments(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 100, 500);

  let q = sb.from("location_form_templates")
    .select("id, location_id, locations(name), template_id, form_templates(name, type, category), public_token")
    .eq("company_id", companyId)
    .order("location_id", { ascending: true })
    .limit(limit);

  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    q = q.eq("location_id", loc.id);
  }

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    assignments: (data || []).map((a: any) => ({
      id: a.id,
      location: a.locations?.name,
      template: a.form_templates?.name,
      template_type: a.form_templates?.type,
      template_category: a.form_templates?.category,
      has_public_link: !!a.public_token,
    })),
  });
}

export async function listFormSubmissions(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Resolve location
  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id")
      .eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (!loc) return capabilityError(`No location matching "${args.location_name}".`);
    locationId = loc.id;
  }

  // Get location_form_template IDs for this company
  let lftQuery = sb.from("location_form_templates")
    .select("id, location_id, locations(name), form_templates(name, category)")
    .eq("company_id", companyId);
  if (locationId) lftQuery = lftQuery.eq("location_id", locationId);

  const { data: lfts, error: lftError } = await lftQuery;
  if (lftError) return capabilityError(lftError.message);
  if (!lfts || lfts.length === 0) return success({ total: 0, submissions: [] });

  const lftIds = lfts.map((l: any) => l.id);
  const lftMap: Record<string, any> = {};
  for (const l of lfts) lftMap[l.id] = l;

  let q = sb.from("form_submissions")
    .select("id, location_form_template_id, status, period_year, period_month, created_at, updated_at")
    .in("location_form_template_id", lftIds)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.period_year) q = q.eq("period_year", args.period_year);
  if (args.period_month) q = q.eq("period_month", args.period_month);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    submissions: (data || []).map((s: any) => {
      const lft = lftMap[s.location_form_template_id];
      return {
        id: s.id,
        form_name: lft?.form_templates?.name,
        category: lft?.form_templates?.category,
        location: lft?.locations?.name,
        status: s.status,
        period: s.period_year && s.period_month ? `${s.period_year}-${String(s.period_month).padStart(2, "0")}` : null,
        updated_at: s.updated_at,
      };
    }),
  });
}

export async function getFormSubmissionDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  if (!args.submission_id) return capabilityError("submission_id is required.");

  // Join through location_form_templates to enforce company scope
  const { data: lft_ids } = await sb.from("location_form_templates")
    .select("id").eq("company_id", companyId);
  if (!lft_ids || lft_ids.length === 0) return capabilityError("No form assignments found.");

  const lftIdSet = lft_ids.map((l: any) => l.id);

  const { data: sub, error } = await sb.from("form_submissions")
    .select("id, location_form_template_id, status, period_year, period_month, data, created_at, updated_at, location_form_templates(location_id, locations(name), form_templates(name, category, type))")
    .eq("id", args.submission_id)
    .in("location_form_template_id", lftIdSet)
    .maybeSingle();

  if (error) return capabilityError(error.message);
  if (!sub) return capabilityError("Submission not found or access denied.");

  const lft = (sub as any).location_form_templates;
  return success({
    id: sub.id,
    form_name: lft?.form_templates?.name,
    form_type: lft?.form_templates?.type,
    category: lft?.form_templates?.category,
    location: lft?.locations?.name,
    status: sub.status,
    period: sub.period_year && sub.period_month
      ? `${sub.period_year}-${String(sub.period_month).padStart(2, "0")}` : null,
    data: sub.data,
    created_at: sub.created_at,
    updated_at: sub.updated_at,
  });
}
