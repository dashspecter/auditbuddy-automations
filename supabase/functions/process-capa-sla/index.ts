import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();

  // Fetch all open/in_progress/pending_verification CAs
  const { data: cas, error } = await supabase
    .from("corrective_actions")
    .select("id, company_id, location_id, title, severity, status, created_at, due_at, stop_the_line")
    .in("status", ["open", "in_progress", "pending_verification"]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const processed = { reminders: 0, warnings: 0, overdues: 0, stl_enforced: 0 };
  const SYSTEM_ACTOR = "00000000-0000-0000-0000-000000000000";

  for (const ca of (cas ?? [])) {
    const start = new Date(ca.created_at).getTime();
    const end = new Date(ca.due_at).getTime();
    const elapsed = now.getTime() - start;
    const total = end - start;
    const pct = total > 0 ? (elapsed / total) * 100 : 100;
    const isOverdue = now > new Date(ca.due_at);

    // Check existing escalation events to avoid duplicates
    const { data: existingEvents } = await supabase
      .from("corrective_action_events")
      .select("event_type, payload")
      .eq("corrective_action_id", ca.id)
      .eq("event_type", "escalated");

    const existingLevels = new Set(
      (existingEvents ?? []).map((e: any) => e.payload?.level as string)
    );

    let level: string | null = null;

    if (isOverdue && !existingLevels.has("overdue")) {
      level = "overdue";
      processed.overdues++;
    } else if (!isOverdue && pct >= 90 && !existingLevels.has("warning") && !existingLevels.has("overdue")) {
      level = "warning";
      processed.warnings++;
    } else if (!isOverdue && pct >= 50 && !existingLevels.has("reminder") && !existingLevels.has("warning") && !existingLevels.has("overdue")) {
      level = "reminder";
      processed.reminders++;
    }

    if (level) {
      await supabase.from("corrective_action_events").insert({
        company_id: ca.company_id,
        corrective_action_id: ca.id,
        actor_id: SYSTEM_ACTOR,
        event_type: "escalated",
        payload: { level, pct_used: Math.round(pct), is_overdue: isOverdue },
      });
    }

    // Enforce stop-the-line for critical CAs
    if (ca.stop_the_line && ca.severity === "critical") {
      const { data: riskState } = await supabase
        .from("location_risk_state")
        .select("is_restricted")
        .eq("company_id", ca.company_id)
        .eq("location_id", ca.location_id)
        .maybeSingle();

      if (!riskState?.is_restricted) {
        await supabase.from("location_risk_state").upsert({
          company_id: ca.company_id,
          location_id: ca.location_id,
          is_restricted: true,
          restricted_reason: ca.title,
          restricted_ca_id: ca.id,
          updated_at: now.toISOString(),
        }, { onConflict: "company_id,location_id" });
        processed.stl_enforced++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, total_cas: (cas ?? []).length }), { headers: corsHeaders });
});
