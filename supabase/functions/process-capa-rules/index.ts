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
  // context shape:
  //   audit_fail: { audit_id, template_id, field_id, field_name, location_id, source_id }
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

    // Check if source already has an open CA
    const { data: existingCA } = await supabase
      .from("corrective_actions")
      .select("id, severity, status")
      .eq("company_id", companyId)
      .eq("source_type", "audit_item_result")
      .eq("source_id", context.source_id ?? context.field_id)
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

    // Create CA
    const { data: ca } = await supabase.from("corrective_actions").insert({
      company_id: companyId,
      location_id: context.location_id,
      source_type: "audit_item_result",
      source_id: context.source_id ?? context.field_id,
      title: `[Auto] ${context.field_name ?? "Audit failure"} — corrective action required`,
      severity,
      status: "open",
      due_at: dueAt,
      requires_approval: cfg.requires_approval ?? severity === "critical",
      approval_role: cfg.approval_role ?? null,
      stop_the_line: stopTheLine,
      created_by: user.id,
    }).select("id").single();

    if (!ca) continue;

    // Insert bundle items
    const bundle = cfg.bundle ?? [];
    if (bundle.length) {
      const items = bundle.map((item: any) => ({
        company_id: companyId,
        corrective_action_id: ca.id,
        title: item.title,
        instructions: item.instructions ?? null,
        assignee_role: item.assignee_role ?? null,
        due_at: new Date(Date.now() + (item.due_hours ?? dueHours) * 3600 * 1000).toISOString(),
        evidence_required: item.evidence_required ?? true,
      }));
      await supabase.from("corrective_action_items").insert(items);
    }

    // Log event
    await supabase.from("corrective_action_events").insert({
      company_id: companyId,
      corrective_action_id: ca.id,
      actor_id: user.id,
      event_type: "created",
      payload: { source: "rule", rule_id: rule.id, trigger_type, item_count: bundle.length },
    });

    // Update location risk state if stop-the-line
    if (stopTheLine) {
      await supabase.from("location_risk_state").upsert({
        company_id: companyId,
        location_id: context.location_id,
        is_restricted: true,
        restricted_reason: `[Auto] ${context.field_name ?? "Audit failure"}`,
        restricted_ca_id: ca.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,location_id" });
    }

    caIds.push(ca.id);
  }

  return new Response(JSON.stringify({ matched: rules.length, ca_ids: caIds }), { headers: corsHeaders });
});
