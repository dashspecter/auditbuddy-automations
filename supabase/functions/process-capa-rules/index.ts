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

  if (!trigger_type || !context) {
    return new Response(JSON.stringify({ error: "Missing trigger_type or context" }), { status: 400, headers: corsHeaders });
  }

  // ── Helper: resolve assignee_role → assignee_user_id ──────────────────────
  // For each bundle item, look up who holds that role at the location.
  // Resolution order:
  //   1. Shift assignments on the audit date at the location with matching role (who is actually working)
  //   2. Employees whose primary location_id matches with the role
  //   3. Company-wide employee with the role (fallback)
  //   4. Company users table (admin/owner roles)
  async function resolveRoleToUserId(role: string, locationId: string | null, auditDate?: string | null): Promise<string | null> {
    if (!role || role === "unassigned") return null;

    // 1. Check who is actually scheduled (shift_assignments) at this location on the audit date
    if (locationId && auditDate) {
      const shiftDate = auditDate.slice(0, 10); // ensure YYYY-MM-DD
      const { data: shiftEmp } = await supabase
        .from("shift_assignments")
        .select("employees!inner(user_id, role)")
        .eq("approval_status", "approved")
        .filter("shifts.location_id", "eq", locationId)
        .filter("shifts.shift_date", "eq", shiftDate)
        .filter("employees.role", "ilike", role)
        .filter("employees.user_id", "not.is", null)
        .limit(1)
        .maybeSingle();
      // @ts-ignore - nested join type
      const scheduledUserId = shiftEmp?.employees?.user_id;
      if (scheduledUserId) return scheduledUserId;
    }

    // 2. Try employees whose primary location matches
    if (locationId) {
      const { data: locEmp } = await supabase
        .from("employees")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .ilike("role", role)
        .not("user_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (locEmp?.user_id) return locEmp.user_id;
    }

    // 3. Company-wide employee fallback (no specific location)
    const { data: compEmp } = await supabase
      .from("employees")
      .select("user_id")
      .eq("company_id", companyId)
      .ilike("role", role)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (compEmp?.user_id) return compEmp.user_id;

    // 4. Company users table fallback (admin/owner roles)
    const { data: compUser } = await supabase
      .from("company_users")
      .select("user_id")
      .eq("company_id", companyId)
      .ilike("company_role", role)
      .limit(1)
      .maybeSingle();
    if (compUser?.user_id) return compUser.user_id;

    return null;
  }

  // ── Helper: evaluate whether an audit field response fails its threshold ──
  function auditFieldFails(
    fieldType: string,
    responseValue: unknown,
    threshold?: number,
  ): boolean {
    const ft = (fieldType ?? "").toLowerCase();

    if (ft === "rating" || ft === "number") {
      const numVal = Number(responseValue);
      if (isNaN(numVal)) return false;
      // threshold defaults to 3 for rating if not set
      const t = threshold ?? 3;
      return numVal <= t;
    }

    if (ft === "yes_no" || ft === "yesno" || ft === "checkbox") {
      const v = String(responseValue ?? "").toLowerCase().trim();
      return v === "no" || v === "false" || v === "0";
    }

    return false;
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
        continue;
      }
    }

    // ── audit_fail: template + field-level threshold filtering ────────────
    let bundleToUse: any[] = cfg.bundle ?? [];
    let fieldRuleMatched = false;

    if (trigger_type === "audit_fail") {
      // 1. Template filter
      const ruleTemplateId = cfg.template_id ?? "any";
      if (ruleTemplateId !== "any" && ruleTemplateId !== context.template_id) {
        continue; // rule targets a different template
      }

      // 2. Field-level rules (new mode)
      const fieldRules: any[] = cfg.field_rules ?? [];
      if (fieldRules.length > 0) {
        // Find a matching enabled field rule for this context's field
        const fieldRule = fieldRules.find(
          (fr: any) => fr.field_id === context.field_id && fr.enabled === true
        );

        if (!fieldRule) {
          continue; // no config for this specific field → skip
        }

        // Evaluate threshold
        if (!auditFieldFails(context.field_type, context.response_value, fieldRule.threshold)) {
          continue; // field passed → no CA needed
        }

        // Use the field-level bundle (may override severity)
        bundleToUse = fieldRule.bundle ?? [];
        fieldRuleMatched = true;

        // If field rule specifies severity, use it; else fall through to cfg.severity
        if (fieldRule.severity) {
          cfg._resolved_severity = fieldRule.severity;
        }
      } else {
        // Global bundle mode (legacy / "any audit") — no threshold check needed,
        // the caller only invokes this for scorable fields with values.
        // Still proceed with cfg.bundle.
      }
    }

    // Determine the dedup source_id
    const sourceId: string =
      trigger_type === "test_fail"
        ? `emp:${context.employee_id ?? "anon"}:test:${context.test_id ?? "unknown"}`
        : (context.source_id ?? context.field_id ?? "unknown");

    const sourceType = trigger_type === "test_fail" ? "test_submission" : "audit_item_result";

    // Check for existing open CA for this source
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
      const resolvedSeverity = cfg._resolved_severity ?? cfg.severity ?? "medium";
      const currentIdx = severityOrder.indexOf(existingCA.severity);
      const targetIdx = severityOrder.indexOf(resolvedSeverity);
      if (targetIdx > currentIdx) {
        await supabase.from("corrective_actions").update({ severity: resolvedSeverity }).eq("id", existingCA.id);
        await supabase.from("corrective_action_events").insert({
          company_id: companyId,
          corrective_action_id: existingCA.id,
          actor_id: user.id,
          event_type: "severity_changed",
          payload: { from: existingCA.severity, to: resolvedSeverity, reason: "rule_re_trigger" },
        });
      }
      caIds.push(existingCA.id);
      continue;
    }

    // Calculate due_at
    const dueHours = cfg.due_hours ?? 24;
    const dueAt = new Date(Date.now() + dueHours * 3600 * 1000).toISOString();

    const severity = cfg._resolved_severity ?? cfg.severity ?? "medium";
    const stopTheLine = cfg.stop_the_line ?? severity === "critical";

    // Build title
    let caTitle: string;
    if (trigger_type === "test_fail") {
      caTitle = `[Auto] Failed Test: ${context.test_title ?? "Training Test"} — corrective action required`;
    } else if (trigger_type === "audit_fail" && context.field_name) {
      caTitle = `[Auto] ${context.field_name} — corrective action required`;
    } else {
      caTitle = `[Auto] ${context.field_name ?? "Audit failure"} — corrective action required`;
    }

    // Resolve location_id
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

    // Build bundle — for test_fail with empty bundle, auto-create a "Retake" item
    let bundle = bundleToUse;
    if (trigger_type === "test_fail" && bundle.length === 0) {
      bundle = [{
        title: `Retake the test: ${context.test_title ?? "Training Test"}`,
        instructions: `Employee scored ${context.score ?? 0}% (pass threshold: ${context.pass_threshold ?? 70}%). Must retake and pass within the deadline.`,
        evidence_required: false,
        due_hours: dueHours,
      }];
    }

    if (bundle.length) {
      // Build items with resolved user IDs — resolve roles in parallel
      const itemsWithResolution = await Promise.all(
        bundle.map(async (item: any) => {
          let assigneeUserId: string | null = null;

          if (trigger_type === "test_fail") {
            // test_fail: always assign directly to the failing employee
            assigneeUserId = employeeUserId;
          } else {
            // audit_fail and others: resolve role → user at the location
            // Pass audit_date so we can check who is actually on shift that day
            const role = item.assignee_role ?? item.assigned_role ?? null;
            if (role && role !== "unassigned") {
              assigneeUserId = await resolveRoleToUserId(role, locationId, context.audit_date ?? null);
            }
          }

          return {
            company_id: companyId,
            corrective_action_id: ca.id,
            title: item.title,
            instructions: item.instructions ?? null,
            assignee_role: item.assignee_role ?? item.assigned_role ?? null,
            assignee_user_id: assigneeUserId,
            due_at: new Date(Date.now() + (item.due_hours ?? dueHours) * 3600 * 1000).toISOString(),
            evidence_required: item.evidence_required ?? false,
          };
        })
      );

      const { error: itemsErr } = await supabase.from("corrective_action_items").insert(itemsWithResolution);
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
        ...(trigger_type === "audit_fail" ? {
          audit_id: context.audit_id,
          template_id: context.template_id,
          field_id: context.field_id,
          field_name: context.field_name,
          response_value: context.response_value,
          field_rule_matched: fieldRuleMatched,
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
