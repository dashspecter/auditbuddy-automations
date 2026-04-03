/**
 * Scout Jobs Capability Module
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";
import { type PermissionContext, checkCapabilityPermission } from "../shared/permissions.ts";
import { makeStructuredEvent } from "../shared/utils.ts";

const VALID_JOB_STATUSES = ["draft", "posted", "accepted", "in_progress", "submitted", "approved", "rejected", "paid", "cancelled", "expired"];

// ─── Read Tools ───

export async function listScoutJobs(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  let locationId: string | null = null;
  if (args.location_name) {
    const { data: loc } = await sb.from("locations").select("id").eq("company_id", companyId).ilike("name", `%${args.location_name}%`).limit(1).maybeSingle();
    if (loc) locationId = loc.id;
  }

  let q = sb.from("scout_jobs")
    .select("id, title, status, payout_amount, currency, time_window_start, time_window_end, posted_at, location_id, locations(name), template_id, scout_templates(title), assigned_scout_id, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (locationId) q = q.eq("location_id", locationId);
  if (args.status) {
    const statuses = Array.isArray(args.status) ? args.status : [args.status];
    q = q.in("status", statuses);
  }
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    jobs: (data || []).map((j: any) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      payout: j.payout_amount ? `${j.payout_amount} ${j.currency || "RON"}` : null,
      location: j.locations?.name,
      template: j.scout_templates?.title,
      time_window_start: j.time_window_start,
      time_window_end: j.time_window_end,
      posted_at: j.posted_at,
      has_scout: !!j.assigned_scout_id,
    })),
  });
}

export async function getScoutJobDetails(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  let q = sb.from("scout_jobs")
    .select("id, title, status, payout_amount, currency, payout_type, reward_description, time_window_start, time_window_end, posted_at, accepted_at, submitted_at, approved_at, notes_public, notes_internal, location_id, locations(name), template_id, scout_templates(title), assigned_scout_id, created_at")
    .eq("company_id", companyId);

  if (args.job_id) {
    q = q.eq("id", args.job_id);
  } else if (args.job_title) {
    q = q.ilike("title", `%${args.job_title}%`).limit(3);
  } else {
    return capabilityError("Provide job_id or job_title.");
  }

  const { data: jobs } = await q.limit(3);
  if (!jobs?.length) return capabilityError("Scout job not found.");
  if (jobs.length > 1) return capabilityError(`Multiple jobs match: ${jobs.map((j: any) => j.title).join(", ")}.`);
  const job = jobs[0];

  // Get submissions for this job
  const { data: submissions } = await sb.from("scout_submissions")
    .select("id, status, submitted_at, reviewer_notes, reviewed_at")
    .eq("job_id", job.id)
    .order("submitted_at", { ascending: false })
    .limit(5);

  return success({
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      payout: job.payout_amount ? `${job.payout_amount} ${job.currency || "RON"}` : null,
      payout_type: job.payout_type,
      reward_description: job.reward_description,
      location: job.locations?.name,
      template: job.scout_templates?.title,
      time_window_start: job.time_window_start,
      time_window_end: job.time_window_end,
      posted_at: job.posted_at,
      accepted_at: job.accepted_at,
      submitted_at: job.submitted_at,
      approved_at: job.approved_at,
      notes_public: job.notes_public,
      notes_internal: job.notes_internal,
    },
    submissions: (submissions || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      submitted_at: s.submitted_at,
      reviewer_notes: s.reviewer_notes,
      reviewed_at: s.reviewed_at,
    })),
  });
}

export async function listScoutSubmissions(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Scope to company's jobs
  const { data: jobIds } = await sb.from("scout_jobs").select("id").eq("company_id", companyId);
  if (!jobIds?.length) return success({ total: 0, submissions: [] });
  const ids = jobIds.map((j: any) => j.id);

  let q = sb.from("scout_submissions")
    .select("id, job_id, status, submitted_at, reviewed_at, reviewer_notes, scout_jobs(title, location_id, locations(name))")
    .in("job_id", ids)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.job_id) q = q.eq("job_id", args.job_id);

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    submissions: (data || []).map((s: any) => ({
      id: s.id,
      job: s.scout_jobs?.title,
      location: s.scout_jobs?.locations?.name,
      status: s.status,
      submitted_at: s.submitted_at,
      reviewed_at: s.reviewed_at,
      reviewer_notes: s.reviewer_notes,
    })),
  });
}

// ─── Write Tools ───

export async function reviewScoutSubmissionDraft(
  sb: any, sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "scouts", ctx });
  if (!permCheck.ok) return permCheck;

  const action = args.action; // "approve" | "reject" | "request_resubmit"
  if (!["approve", "reject", "request_resubmit"].includes(action)) {
    return capabilityError(`Invalid action "${action}". Use: approve, reject, request_resubmit.`);
  }

  // Resolve submission
  const { data: submission } = await sb.from("scout_submissions")
    .select("id, status, job_id, scout_jobs(title, company_id)")
    .eq("id", args.submission_id)
    .maybeSingle();

  if (!submission) return capabilityError("Submission not found.");
  if (submission.scout_jobs?.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (submission.status !== "pending_review") return capabilityError(`Submission is already "${submission.status}".`);

  const statusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    request_resubmit: "resubmit_required",
  };

  const draft = {
    submission_id: submission.id,
    job_id: submission.job_id,
    job_title: submission.scout_jobs?.title,
    action,
    new_status: statusMap[action],
    reviewer_notes: args.reviewer_notes || null,
  };

  const { data: paData, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, user_id: userId,
    action_name: "review_scout_submission",
    action_type: "write", risk_level: "high", preview_json: draft, status: "pending",
  }).select("id").single();
  if (paError || !paData?.id) return capabilityError(`Failed to create draft: ${paError?.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    action: `${action.charAt(0).toUpperCase() + action.slice(1)} Scout Submission`,
    summary: `${action.toUpperCase()} submission for "${draft.job_title}"${args.reviewer_notes ? `: "${args.reviewer_notes}"` : ""}`,
    risk: "high",
    affected: [draft.job_title],
    pending_action_id: paData.id,
    draft,
    can_approve: true,
  }));

  return success({ type: "scout_review_draft", draft, pending_action_id: paData.id, requires_approval: true });
}

export async function executeScoutSubmissionReview(
  sbService: any, companyId: string, userId: string, args: any, structuredEvents: string[],
  ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "scouts", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;
  const now = new Date().toISOString();

  const { error } = await sbService.from("scout_submissions").update({
    status: d.new_status,
    reviewer_user_id: userId,
    reviewer_notes: d.reviewer_notes,
    reviewed_at: now,
  }).eq("id", d.submission_id);

  if (error) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: error.message }, updated_at: now }).eq("id", pa.id);
    return capabilityError(`Failed to update submission: ${error.message}`);
  }

  // If approved, also update job status
  if (d.action === "approve") {
    await sbService.from("scout_jobs").update({ status: "approved", approved_at: now, reviewer_user_id: userId }).eq("id", d.job_id);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: now, approved_by: userId,
    execution_result: { success: true, new_status: d.new_status }, updated_at: now,
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success",
    title: `Submission ${d.action === "approve" ? "Approved" : d.action === "reject" ? "Rejected" : "Sent Back for Resubmission"}`,
    summary: `Submission for "${d.job_title}" has been ${d.new_status.replace("_", " ")}.`,
  }));

  return success({ type: "submission_reviewed", new_status: d.new_status });
}

// ─── Scout Payouts ───

export async function listScoutPayouts(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const limit = Math.min(args.limit || 50, 200);

  // Scope via scout_jobs to enforce company_id
  const { data: jobs } = await sb.from("scout_jobs").select("id").eq("company_id", companyId);
  if (!jobs || jobs.length === 0) return success({ total: 0, payouts: [] });
  const jobIds = jobs.map((j: any) => j.id);

  let q = sb.from("scout_payouts")
    .select("id, scout_id, scouts(full_name, email), job_id, scout_jobs(title), amount, currency, status, method, paid_at, created_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) q = q.eq("status", args.status);
  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  return success({
    total: data?.length ?? 0,
    payouts: (data || []).map((p: any) => ({
      id: p.id,
      scout: p.scouts?.full_name || p.scouts?.email,
      job: p.scout_jobs?.title,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      paid_at: p.paid_at,
      created_at: p.created_at,
    })),
  });
}

export async function getScoutPayoutSummary(
  sb: any, companyId: string, args: any
): Promise<CapabilityResult<any>> {
  const { data: jobs } = await sb.from("scout_jobs").select("id").eq("company_id", companyId);
  if (!jobs || jobs.length === 0) return success({ total_pending: 0, total_paid: 0, pending_count: 0, paid_count: 0 });
  const jobIds = jobs.map((j: any) => j.id);

  let q = sb.from("scout_payouts")
    .select("id, amount, currency, status, paid_at")
    .in("job_id", jobIds);

  if (args.from) q = q.gte("created_at", args.from);
  if (args.to) q = q.lte("created_at", args.to + "T23:59:59Z");

  const { data, error } = await q;
  if (error) return capabilityError(error.message);

  const all = data || [];
  const pending = all.filter((p: any) => p.status === "pending");
  const paid = all.filter((p: any) => p.status === "paid");
  const failed = all.filter((p: any) => p.status === "failed");

  const sumAmount = (arr: any[]) => arr.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

  return success({
    pending_count: pending.length,
    paid_count: paid.length,
    failed_count: failed.length,
    total_pending: sumAmount(pending),
    total_paid: sumAmount(paid),
    currency: all[0]?.currency || "USD",
    by_status: [
      { status: "pending", count: pending.length, total: sumAmount(pending) },
      { status: "paid", count: paid.length, total: sumAmount(paid) },
      { status: "failed", count: failed.length, total: sumAmount(failed) },
    ],
  });
}

export async function processScoutPayoutDraft(
  sb: any, sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "scouts", ctx });
  if (!permCheck.ok) return permCheck;

  if (!args.payout_id) return capabilityError("payout_id is required.");

  const VALID_STATUSES = ["paid", "failed"];
  const newStatus = args.new_status;
  if (!VALID_STATUSES.includes(newStatus)) {
    return capabilityError(`new_status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // Verify payout belongs to this company via job
  const { data: payout } = await sb.from("scout_payouts")
    .select("id, scout_id, scouts(full_name, email), job_id, scout_jobs(title, company_id), amount, currency, status")
    .eq("id", args.payout_id).maybeSingle();

  if (!payout) return capabilityError("Payout not found.");
  if ((payout as any).scout_jobs?.company_id !== companyId) return capabilityError("Access denied.");
  if (payout.status === newStatus) return capabilityError(`Payout is already ${newStatus}.`);

  const scoutName = (payout as any).scouts?.full_name || (payout as any).scouts?.email || "Unknown scout";
  const jobTitle = (payout as any).scout_jobs?.title || "Unknown job";

  const draft = {
    payout_id: args.payout_id,
    scout_name: scoutName,
    job_title: jobTitle,
    amount: payout.amount,
    currency: payout.currency,
    current_status: payout.status,
    new_status: newStatus,
    notes: args.notes ?? null,
  };

  const { data: pa, error: paError } = await sbService.from("dash_pending_actions").insert({
    company_id: companyId, created_by: userId, action_type: "write",
    action_name: "process_scout_payout", risk_level: "high",
    preview_json: draft, status: "pending",
  }).select("id").single();

  if (paError) return capabilityError(`Failed to create draft: ${paError.message}`);

  structuredEvents.push(makeStructuredEvent("action_preview", {
    pending_action_id: pa.id,
    action_name: "process_scout_payout",
    risk_level: "high",
    title: "Process Scout Payout",
    summary: `Mark payout of **${payout.amount} ${payout.currency}** to **${scoutName}** for job "${jobTitle}" as **${newStatus}**.`,
    fields: [
      { label: "Scout", value: scoutName },
      { label: "Job", value: jobTitle },
      { label: "Amount", value: `${payout.amount} ${payout.currency}` },
      { label: "Current Status", value: payout.status },
      { label: "New Status", value: newStatus },
      ...(args.notes ? [{ label: "Notes", value: args.notes }] : []),
    ],
  }));

  return success({ pending_action_id: pa.id, draft });
}

export async function executeProcessScoutPayout(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[], ctx: PermissionContext
): Promise<CapabilityResult<any>> {
  const permCheck = checkCapabilityPermission({ action: "update", module: "scouts", ctx });
  if (!permCheck.ok) return permCheck;

  const { data: pa } = await sbService.from("dash_pending_actions")
    .select("id, status, company_id, preview_json").eq("id", args.pending_action_id).maybeSingle();
  if (!pa) return capabilityError("Pending action not found.");
  if (pa.company_id !== companyId) return capabilityError("Cross-tenant action rejected.");
  if (pa.status !== "pending") return capabilityError(`Action already ${pa.status}.`);

  const d = pa.preview_json as any;

  const updateData: any = { status: d.new_status, updated_at: new Date().toISOString() };
  if (d.new_status === "paid") updateData.paid_at = new Date().toISOString();

  const { error: updateError } = await sbService.from("scout_payouts")
    .update(updateData).eq("id", d.payout_id);

  if (updateError) {
    await sbService.from("dash_pending_actions").update({ status: "failed", execution_result: { error: updateError.message }, updated_at: new Date().toISOString() }).eq("id", pa.id);
    return capabilityError(`Failed to update payout: ${updateError.message}`);
  }

  await sbService.from("dash_pending_actions").update({
    status: "executed", approved_at: new Date().toISOString(), approved_by: userId,
    execution_result: { success: true, payout_id: d.payout_id, new_status: d.new_status }, updated_at: new Date().toISOString(),
  }).eq("id", pa.id);

  structuredEvents.push(makeStructuredEvent("execution_result", {
    status: "success", title: "Payout Updated",
    summary: `Payout of ${d.amount} ${d.currency} for ${d.scout_name} marked as ${d.new_status}.`,
    changes: [`${d.scout_name}: ${d.current_status} → ${d.new_status}`],
  }));

  return success({ type: "scout_payout_processed", payout_id: d.payout_id, new_status: d.new_status });
}
