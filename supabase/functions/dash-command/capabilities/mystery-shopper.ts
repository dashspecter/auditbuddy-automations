/**
 * Mystery Shopper Capability Module
 * Phase 4: Read-only access to mystery shopper results and vouchers.
 * Tables: mystery_shopper_templates, mystery_shopper_submissions, vouchers
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { cap } from "../shared/utils.ts";

// ─── Read Tools ───

export async function listMysteryShopperResults(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Scope via templates
  const { data: templates } = await sb.from("mystery_shopper_templates")
    .select("id, name").eq("company_id", companyId);
  if (!templates || templates.length === 0) return success({ total: 0, submissions: [] });

  const templateIds = templates.map((t: any) => t.id);
  const templateMap: Record<string, string> = {};
  for (const t of templates) templateMap[t.id] = t.name;

  let q = sb.from("mystery_shopper_submissions")
    .select("id, template_id, customer_name, customer_email, overall_score, created_at, voucher_id")
    .in("template_id", templateIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.template_name) {
    const matching = templates.filter((t: any) => t.name.toLowerCase().includes(args.template_name.toLowerCase()));
    if (matching.length === 0) return capabilityError(`No template matching "${args.template_name}".`);
    q = q.in("template_id", matching.map((t: any) => t.id));
  }
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    submissions: (data || []).map((s: any) => ({
      id: s.id,
      template: templateMap[s.template_id],
      customer_name: s.customer_name,
      overall_score: s.overall_score,
      has_voucher: !!s.voucher_id,
      created_at: s.created_at,
    })),
  });
}

export async function getMysteryShopperScores(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  // Scope via templates
  const { data: templates } = await sb.from("mystery_shopper_templates")
    .select("id, name").eq("company_id", companyId);
  if (!templates || templates.length === 0) {
    return success({ avg_score: null, total_submissions: 0, by_template: [] });
  }

  const templateIds = templates.map((t: any) => t.id);
  const templateMap: Record<string, string> = {};
  for (const t of templates) templateMap[t.id] = t.name;

  let q = sb.from("mystery_shopper_submissions")
    .select("id, template_id, overall_score, created_at")
    .in("template_id", templateIds);

  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q.limit(1000);
  if (error) return capabilityError(error.message);

  const all = data || [];

  // Aggregate by template
  const byTemplate: Record<string, { name: string; scores: number[]; count: number }> = {};
  for (const s of all) {
    if (!byTemplate[s.template_id]) byTemplate[s.template_id] = { name: templateMap[s.template_id], scores: [], count: 0 };
    byTemplate[s.template_id].count++;
    if (s.overall_score != null) byTemplate[s.template_id].scores.push(s.overall_score);
  }

  const byTemplateArr = Object.values(byTemplate).map((t: any) => ({
    template: t.name,
    count: t.count,
    avg_score: t.scores.length > 0 ? Math.round(t.scores.reduce((a: number, b: number) => a + b, 0) / t.scores.length * 10) / 10 : null,
  })).sort((a: any, b: any) => b.count - a.count);

  const allScores = all.filter((s: any) => s.overall_score != null).map((s: any) => s.overall_score);
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length * 10) / 10
    : null;

  return success({
    total_submissions: all.length,
    avg_score: avgScore,
    by_template: byTemplateArr,
  });
}

export async function listVouchers(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let q = sb.from("vouchers")
    .select("id, code, value, currency, status, expires_at, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const all = data || [];
  const active = all.filter((v: any) => v.status === "active").length;
  const redeemed = all.filter((v: any) => v.status === "redeemed").length;
  const expired = all.filter((v: any) => v.status === "expired").length;

  const c = cap(data, limit);
  return success({
    total: c.total,
    active,
    redeemed,
    expired,
    vouchers: c.items.map((v: any) => ({
      id: v.id,
      code: v.code,
      value: v.value,
      currency: v.currency,
      status: v.status,
      expires_at: v.expires_at,
    })),
  });
}
