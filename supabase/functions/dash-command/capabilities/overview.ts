/**
 * Overview Capability Module
 * Cross-module aggregates and location search.
 * Phase 8: Standardized on CapabilityResult.
 */
import { AUDIT_FINISHED_STATUSES } from "../shared/constants.ts";
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";

export async function searchLocations(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("locations").select("id, name, address").eq("company_id", companyId).ilike("name", `%${args.query}%`).limit(10);
  if (error) return capabilityError(error.message);
  return success({ locations: data });
}

export async function getLocationOverview(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let locationId = args.location_id;
  let locationName = args.location_name;
  if (!locationId && locationName) {
    const { data } = await sb.from("locations").select("id, name").eq("company_id", companyId).ilike("name", `%${locationName}%`).limit(1);
    if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
    else return capabilityError(`No location found matching "${locationName}"`);
  }
  if (!locationId) return capabilityError("Please provide a location name or ID");

  // Fetch last 30 audits to compute both latest score and 30-day average
  const [empRes, auditRes, caRes, taskRes] = await Promise.all([
    sb.from("employees").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "active"),
    sb.from("location_audits").select("overall_score, audit_date").eq("location_id", locationId).in("status", AUDIT_FINISHED_STATUSES).not("overall_score", "is", null).order("audit_date", { ascending: false }).limit(30),
    sb.from("corrective_actions").select("id", { count: "exact", head: true }).eq("location_id", locationId).in("status", ["open", "in_progress"]),
    sb.from("tasks").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("company_id", companyId),
  ]);

  const auditScores: number[] = (auditRes.data ?? []).map((a: any) => a.overall_score);
  const latestAuditScore: number | null = auditScores[0] ?? null;
  const avgAuditScore: number | null = auditScores.length > 0
    ? Math.round(auditScores.reduce((s, v) => s + v, 0) / auditScores.length)
    : null;

  return success({
    location: { id: locationId, name: locationName },
    employees_active: empRes.count ?? 0,
    // latest_audit_score: most recent completed audit — use when asking "what was the last audit?"
    latest_audit_score: latestAuditScore,
    // avg_audit_score: average of last 30 audits — consistent with dashboard cards
    avg_audit_score: avgAuditScore,
    audit_count: auditScores.length,
    open_corrective_actions: caRes.count ?? 0,
    total_tasks: taskRes.count ?? 0,
  });
}

export async function getCrossModuleSummary(
  sb: any, companyId: string, args: any,
  utcRange: (sb: any, from: string, to: string) => Promise<{ fromUtc: string; toUtc: string } | null>
): Promise<CapabilityResult<any>> {
  const ur = await utcRange(sb, args.from, args.to);

  // Resolve location_name → location_id if only name was provided
  let locationFilter = args.location_id;
  let resolvedLocationName: string | null = null;
  if (!locationFilter && args.location_name) {
    const { data: locRow } = await sb.from("locations")
      .select("id, name").eq("company_id", companyId)
      .ilike("name", `%${args.location_name}%`).limit(1);
    if (locRow?.[0]) {
      locationFilter = locRow[0].id;
      resolvedLocationName = locRow[0].name;
    } else {
      return capabilityError(`No location found matching "${args.location_name}"`);
    }
  }

  // Filter audits at DB level (only finished statuses) — prevents JS post-filter from missing records
  let auditQ = sb.from("location_audits")
    .select("id, overall_score, status, location_id, locations(name)")
    .eq("company_id", companyId)
    .in("status", AUDIT_FINISHED_STATUSES)
    .gte("audit_date", args.from)
    .lte("audit_date", args.to);
  if (locationFilter) auditQ = auditQ.eq("location_id", locationFilter);
  const { data: audits } = await auditQ.limit(500);

  // All returned audits are already finished (filtered at DB level)
  const finishedAudits = audits ?? [];
  const scoredAudits = finishedAudits.filter((a: any) => a.overall_score != null && a.overall_score > 0);
  const avgScore = scoredAudits.length > 0 ? Math.round(scoredAudits.reduce((s: number, a: any) => s + a.overall_score, 0) / scoredAudits.length) : null;

  let caQ = sb.from("corrective_actions").select("id, severity, status, location_id").eq("company_id", companyId).in("status", ["open", "in_progress"]);
  if (locationFilter) caQ = caQ.eq("location_id", locationFilter);
  const { data: cas } = await caQ.limit(200);

  let attQ = sb.from("attendance_logs").select("id, is_late, late_minutes, auto_clocked_out, check_out_at");
  if (ur) attQ = attQ.gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc);
  if (locationFilter) {
    attQ = attQ.eq("location_id", locationFilter);
  } else {
    // Defense-in-depth: attendance_logs has no company_id, scope via company locations
    const { data: companyLocs } = await sb.from("locations").select("id").eq("company_id", companyId);
    const locIds = (companyLocs ?? []).map((l: any) => l.id);
    if (locIds.length > 0) attQ = attQ.in("location_id", locIds);
    else {
      // No locations = no attendance data possible
      return success({
        date_range: { from: args.from, to: args.to },
        location_id: "all",
        audits: { total: 0, finished: 0, scored: 0, avg_score: null },
        corrective_actions: { open: 0, in_progress: 0, by_severity: { critical: 0, high: 0 } },
        attendance: { total_logs: 0, late_arrivals: 0, missing_checkouts: 0 },
        work_orders: { open: 0, in_progress: 0 },
      });
    }
  }
  const { data: attLogs } = await attQ.limit(1000);

  const lateCount = (attLogs ?? []).filter((l: any) => l.is_late).length;
  const noCheckout = (attLogs ?? []).filter((l: any) => !l.check_out_at && !l.auto_clocked_out).length;

  let woQ = sb.from("cmms_work_orders").select("id, status, priority").eq("company_id", companyId);
  if (locationFilter) woQ = woQ.eq("location_id", locationFilter);
  const { data: wos } = await woQ.in("status", ["open", "in_progress"]).limit(200);

  return success({
    date_range: { from: args.from, to: args.to },
    location_id: locationFilter ?? "all",
    location_name: resolvedLocationName ?? args.location_name ?? null,
    audits: { total: finishedAudits.length, finished: finishedAudits.length, scored: scoredAudits.length, avg_score: avgScore },
    corrective_actions: { open: (cas ?? []).filter((c: any) => c.status === "open").length, in_progress: (cas ?? []).filter((c: any) => c.status === "in_progress").length, by_severity: { critical: (cas ?? []).filter((c: any) => c.severity === "critical").length, high: (cas ?? []).filter((c: any) => c.severity === "high").length } },
    attendance: { total_logs: (attLogs ?? []).length, late_arrivals: lateCount, missing_checkouts: noCheckout },
    work_orders: { open: (wos ?? []).filter((w: any) => w.status === "open").length, in_progress: (wos ?? []).filter((w: any) => w.status === "in_progress").length },
  });
}
