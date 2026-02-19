import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Get company
  const { data: cu } = await supabase.from("company_users").select("company_id").eq("user_id", user.id).maybeSingle();
  const companyId = cu?.company_id;
  if (!companyId) {
    return new Response(JSON.stringify({ error: "No company" }), { status: 400, headers: corsHeaders });
  }

  const body = await req.json();
  const { trigger_type, context } = body;
  // context shapes:
  //   audit_fail:   { audit_id, template_id, field_id, field_name, location_id, source_id }
  //   test_fail:    { test_submission_id, test_id, test_title, employee_id, location_id, score, pass_threshold }
  //   (incident_repeat, asset_downtime_pattern — future phases)

  if (!trigger_type || !context) {
    return new Response(JSON.stringify({ error: "Missing trigger_type or context" }), { status: 400, headers: corsHeaders });
  }

  // Fetch enabled rules
  const { data: rules } = await supabase
    .from("corrective_action_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("enabled", true)
    .eq("trigger_type", trigger_type);

  if (!rules?.length) {
    return new Response(JSON.stringify({ matched: 0, ca_ids: [] }), { headers: corsHeaders });
  }

  const caIds: string[] = [];

  for (const rule of rules) {
    const cfg = rule.trigger_config as Record<string, any>;

    // ── test_fail: filter by test_id if rule targets a specific test ──
    if (trigger_type === "test_fail") {
      const ruleTestId = cfg.test_id ?? "any";
      if (ruleTestId !== "any" && ruleTestId !== context.test_id) {
        continue; // this rule targets a different test
      }
    }

    // Determine the dedup source_id.
    // For test_fail: use a composite key per employee+test so repeated failures
    // reuse one CA instead of spawning duplicates.
    const sourceId: string =
      trigger_type === "test_fail"
        ? `emp:${context.employee_id ?? "anon"}:test:${context.test_id ?? "unknown"}`
        : (context.source_id ?? context.field_id ?? "unknown");

    const sourceType = trigger_type === "test_fail" ? "test_submission" : "audit_item_result";

    // Check if the employee already has an open CA for this test
    const { data: existingCA } = await supabase
      .from("corrective_actions")
      .select("id, severity, status")
      .eq("company_id", companyId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .not("status", "in", '("closed","cancelled")')
      .maybeSingle();

    if (existingCA) {
      // Escalate severity if re-triggered
      const severityOrder = ["low", "medium", "high", "critical"];
      const currentIdx = severityOrder.indexOf(existingCA.severity);
      const targetIdx = severityOrder.indexOf(cfg.severity ?? "medium");
      if (targetIdx > currentIdx) {
        await supabase.from("corrective_actions").update({ severity: cfg.severity }).eq("id", existingCA.id);
        await supabase.from("corrective_action_events").insert({
          company_id: companyId,
          corrective_action_id: existingCA.id,
          actor_id: user.id,
          event_type: "severity_changed",
          payload: { from: existingCA.severity, to: cfg.severity, reason: "rule_re_trigger" },
        });
      }
      caIds.push(existingCA.id);
      continue;
    }

    // Calculate due_at
    const dueHours = cfg.due_hours ?? 24;
    const dueAt = new Date(Date.now() + dueHours * 3600 * 1000).toISOString();

    const severity = cfg.severity ?? "medium";
    const stopTheLine = cfg.stop_the_line ?? severity === "critical";

    // Build title
    let caTitle: string;
    if (trigger_type === "test_fail") {
      caTitle = `[Auto] Failed Test: ${context.test_title ?? "Training Test"} — corrective action required`;
    } else {
      caTitle = `[Auto] ${context.field_name ?? "Audit failure"} — corrective action required`;
    }

    // Resolve location_id — for test_fail, fall back to employee's location if not passed
    let locationId = context.location_id ?? null;
    if (!locationId && trigger_type === "test_fail" && context.employee_id) {
      const { data: empLoc } = await supabase
        .from("employees")
        .select("location_id")
        .eq("id", context.employee_id)
        .maybeSingle();
      locationId = empLoc?.location_id ?? null;
    }

    // Create CA
    const { data: ca, error: caInsertErr } = await supabase.from("corrective_actions").insert({
      company_id: companyId,
      location_id: locationId,
      source_type: sourceType,
      source_id: sourceId,
      title: caTitle,
      severity,
      status: "open",
      due_at: dueAt,
      requires_approval: cfg.requires_approval ?? severity === "critical",
      approval_role: cfg.approval_role ?? null,
      stop_the_line: stopTheLine,
      created_by: user.id,
    }).select("id").single();

    if (caInsertErr || !ca) {
      console.error("[process-capa-rules] Failed to insert CA:", caInsertErr?.message);
      continue;
    }

    // For test_fail: assign bundle items to the failing employee's user_id if available
    let employeeUserId: string | null = null;
    if (trigger_type === "test_fail" && context.employee_id) {
      const { data: emp } = await supabase
        .from("employees")
        .select("user_id")
        .eq("id", context.employee_id)
        .maybeSingle();
      employeeUserId = emp?.user_id ?? null;
    }

    // Insert bundle items
    // For test_fail with empty bundle, auto-create a "Retake the test" action item
    let bundle = cfg.bundle ?? [];
    if (trigger_type === "test_fail" && bundle.length === 0) {
      bundle = [{
        title: `Retake the test: ${context.test_title ?? "Training Test"}`,
        instructions: `Employee scored ${context.score ?? 0}% (pass threshold: ${context.pass_threshold ?? 70}%). Must retake and pass within the deadline.`,
        evidence_required: false,
        due_hours: dueHours,
      }];
    }

    if (bundle.length) {
      const items = bundle.map((item: any) => ({
        company_id: companyId,
        corrective_action_id: ca.id,
        title: item.title,
        instructions: item.instructions ?? null,
        assignee_role: item.assignee_role ?? item.assigned_role ?? null,
        // For test_fail, auto-assign to the failing employee directly
        assignee_user_id: trigger_type === "test_fail" ? employeeUserId : null,
        due_at: new Date(Date.now() + (item.due_hours ?? dueHours) * 3600 * 1000).toISOString(),
        evidence_required: item.evidence_required ?? false,
      }));
      const { error: itemsErr } = await supabase.from("corrective_action_items").insert(items);
      if (itemsErr) {
        console.error("[process-capa-rules] Failed to insert CA items:", itemsErr?.message);
      }
    }

    // Log event
    await supabase.from("corrective_action_events").insert({
      company_id: companyId,
      corrective_action_id: ca.id,
      actor_id: user.id,
      event_type: "created",
      payload: {
        source: "rule",
        rule_id: rule.id,
        trigger_type,
        item_count: bundle.length,
        ...(trigger_type === "test_fail" ? {
          test_id: context.test_id,
          test_title: context.test_title,
          employee_id: context.employee_id,
          score: context.score,
        } : {}),
      },
    });

    // Update location risk state if stop-the-line
    if (stopTheLine && locationId) {
      await supabase.from("location_risk_state").upsert({
        company_id: companyId,
        location_id: locationId,
        is_restricted: true,
        restricted_reason: caTitle,
        restricted_ca_id: ca.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,location_id" });
    }

    caIds.push(ca.id);
  }

  return new Response(JSON.stringify({ matched: rules.length, ca_ids: caIds }), { headers: corsHeaders });
});
